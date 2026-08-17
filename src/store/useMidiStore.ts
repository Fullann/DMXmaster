import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MidiSignature {
  channel: number
  type: 'note' | 'cc'
  index: number // The note number or CC number
}

interface MidiState {
  isLearning: boolean
  learningWidgetId: string | null
  mappings: Record<string, MidiSignature> // WidgetId -> Signature
  // Connection
  midiInputs: any[]
  midiStatus: string
  lastMessage: any | null
  
  // MTC
  mtcTimeMs: number
  mtcActive: boolean

  // Actions
  toggleLearning: () => void
  setLearningWidget: (id: string | null) => void
  setMapping: (widgetId: string, sig: MidiSignature) => void
  removeMapping: (widgetId: string) => void

  init: () => () => void
  initMidi: () => () => void // alias for old components
  
  // Internal for tests/MTC
  _handleMidiData: (data: Uint8Array) => void
  _checkMtcActivity: () => void
  
  
  // Runtime callback registration (not persisted)
  callbacks: Map<string, (val: number) => void>
  registerCallback: (widgetId: string, cb: (val: number) => void) => void
  unregisterCallback: (widgetId: string) => void
}

export const useMidiStore = create<MidiState>()(
  persist(
    (set, get) => {
      let midiAccess: any = null

      let mtcBuffer = { f: 0, s: 0, m: 0, h: 0, rate: 25 }
      let mtcTimeout: any = null

      const _checkMtcActivity = () => {
        set({ mtcActive: false })
      }

      const _handleMidiData = (data: Uint8Array) => {
        if (data[0] === 0xF1) {
          // Quarter frame MTC
          const byte = data[1]
          const msgType = (byte >> 4) & 0x07
          const val = byte & 0x0F

          switch (msgType) {
            case 0: mtcBuffer.f = (mtcBuffer.f & 0x10) | val; break;
            case 1: mtcBuffer.f = (mtcBuffer.f & 0x0F) | (val << 4); break;
            case 2: mtcBuffer.s = (mtcBuffer.s & 0x30) | val; break;
            case 3: mtcBuffer.s = (mtcBuffer.s & 0x0F) | (val << 4); break;
            case 4: mtcBuffer.m = (mtcBuffer.m & 0x30) | val; break;
            case 5: mtcBuffer.m = (mtcBuffer.m & 0x0F) | (val << 4); break;
            case 6: mtcBuffer.h = (mtcBuffer.h & 0x10) | val; break;
            case 7: {
              mtcBuffer.h = (mtcBuffer.h & 0x0F) | ((val & 0x01) << 4);
              const rateIdx = (val >> 1) & 0x03;
              const rates = [24, 25, 29.97, 30];
              mtcBuffer.rate = rates[rateIdx] || 25;
              
              // Frame 7 completes the timecode
              const ms = (mtcBuffer.h * 3600000) + 
                         (mtcBuffer.m * 60000) + 
                         (mtcBuffer.s * 1000) + 
                         Math.floor((mtcBuffer.f / mtcBuffer.rate) * 1000);
              
              set({ mtcTimeMs: ms, mtcActive: true })

              // Auto deactivate if no MTC for 500ms
              if (mtcTimeout) clearTimeout(mtcTimeout)
              mtcTimeout = setTimeout(_checkMtcActivity, 500)
              break;
            }
          }
        }
      }

      const handleMidiMessage = (msg: any) => {
        // Feed raw data to MTC parser
        if (msg.data instanceof Uint8Array) {
          _handleMidiData(msg.data)
        }

        const [status, data1, data2] = msg.data
        const channel = status & 0x0F
        const cmd = status >> 4

        let type: 'noteOn' | 'noteOff' | 'cc' | 'pitchBend' | 'unknown' = 'unknown'
        let index = data1
        let value = data2 // 0-127

        if (cmd === 9 && data2 > 0) type = 'noteOn'
        else if (cmd === 8 || (cmd === 9 && data2 === 0)) type = 'noteOff'
        else if (cmd === 11) type = 'cc'
        else if (cmd === 14) type = 'pitchBend'

        set({
          lastMessage: {
            type,
            channel,
            note: index,
            velocity: value
          }
        })

        let sigType: 'note' | 'cc' | null = null
        if (type === 'noteOn') { sigType = 'note'; value = 255 }
        else if (type === 'noteOff') { sigType = 'note'; value = 0 }
        else if (type === 'cc') { sigType = 'cc'; value = Math.round((value / 127) * 255) }

        if (!sigType) return

        const { isLearning, learningWidgetId, mappings, callbacks, setMapping } = get()

        if (isLearning && learningWidgetId) {
          // Learn mode active!
          const sig: MidiSignature = { channel, type, index }
          setMapping(learningWidgetId, sig)
          console.log(`[MIDI] Mapped widget ${learningWidgetId} to ${type} ${index} on ch ${channel}`)
          set({ learningWidgetId: null }) // Done learning this widget
          return
        }

        // Play mode: find matching widgets
        for (const [wId, sig] of Object.entries(mappings)) {
          if (sig.channel === channel && sig.type === type && sig.index === index) {
            const cb = callbacks.get(wId)
            if (cb) {
              cb(value)
            }
          }
        }
      }

      return {
        isLearning: false,
        learningWidgetId: null,
        mappings: {},
        callbacks: new Map(),
        midiInputs: [],
        midiStatus: 'unavailable',
        lastMessage: null,
        mtcTimeMs: 0,
        mtcActive: false,

        _handleMidiData,
        _checkMtcActivity,

        toggleLearning: () => set(state => {
          if (state.isLearning) return { isLearning: false, learningWidgetId: null }
          return { isLearning: true, learningWidgetId: null }
        }),

        setLearningWidget: (id) => set({ learningWidgetId: id }),

        setMapping: (widgetId, sig) => set(state => ({
          mappings: { ...state.mappings, [widgetId]: sig }
        })),

        removeMapping: (widgetId) => set(state => {
          const next = { ...state.mappings }
          delete next[widgetId]
          return { mappings: next }
        }),

        registerCallback: (widgetId, cb) => {
          get().callbacks.set(widgetId, cb)
        },
        
        unregisterCallback: (widgetId) => {
          get().callbacks.delete(widgetId)
        },

        initMidi: () => get().init(),

        init: () => {
          if (midiAccess) return () => {} // Already initialized
          
          set({ midiStatus: 'requesting' })

          ;(async () => {
            try {
              if (!(navigator as any).requestMIDIAccess) {
                console.warn('[MIDI] Web MIDI API not supported in this environment.')
                set({ midiStatus: 'unavailable' })
                return
              }
              midiAccess = await (navigator as any).requestMIDIAccess()
              console.log('[MIDI] Access granted. Inputs:', midiAccess.inputs.size)
              
              set({ 
                midiStatus: 'granted', 
                midiInputs: Array.from(midiAccess.inputs.values())
              })
              
              midiAccess.inputs.forEach((input: any) => {
                input.onmidimessage = handleMidiMessage
              })

              midiAccess.onstatechange = (e: any) => {
                set({ midiInputs: Array.from(midiAccess.inputs.values()) })
                if (e.port.type === 'input' && e.port.state === 'connected') {
                  const input = e.port
                  input.onmidimessage = handleMidiMessage
                  console.log(`[MIDI] Connected: ${input.name}`)
                }
              }
            } catch (err) {
              console.error('[MIDI] Failed to initialize:', err)
              set({ midiStatus: 'error' })
            }
          })();

          // Return a cleanup function
          return () => {
            if (midiAccess) {
              midiAccess.inputs.forEach((input: any) => {
                input.onmidimessage = null
              })
            }
          }
        }
      }
    },
    {
      name: 'dmx-midi-storage',
      partialize: (state) => ({ mappings: state.mappings }) // Only persist mappings
    }
  )
)
