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

  // Actions
  toggleLearning: () => void
  setLearningWidget: (id: string | null) => void
  setMapping: (widgetId: string, sig: MidiSignature) => void
  removeMapping: (widgetId: string) => void

  init: () => () => void
  initMidi: () => () => void // alias for old components
  
  
  // Runtime callback registration (not persisted)
  callbacks: Map<string, (val: number) => void>
  registerCallback: (widgetId: string, cb: (val: number) => void) => void
  unregisterCallback: (widgetId: string) => void
}

export const useMidiStore = create<MidiState>()(
  persist(
    (set, get) => {
      let midiAccess: any = null

      const handleMidiMessage = (msg: any) => {
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
