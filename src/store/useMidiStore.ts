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
  
  // Actions
  toggleLearning: () => void
  setLearningWidget: (id: string | null) => void
  setMapping: (widgetId: string, sig: MidiSignature) => void
  removeMapping: (widgetId: string) => void
  
  // Connection
  initMidi: () => void
  
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

        let type: 'note' | 'cc' | null = null
        let index = data1
        let value = data2 // 0-127

        if (cmd === 9 && data2 > 0) {
          type = 'note'
          value = 255 // Map Note On to full 255 DMX value
        } else if (cmd === 8 || (cmd === 9 && data2 === 0)) {
          type = 'note'
          value = 0 // Note Off
        } else if (cmd === 11) {
          type = 'cc'
          // Map CC 0-127 to 0-255
          value = Math.round((data2 / 127) * 255)
        }

        if (!type) return

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

        initMidi: async () => {
          if (midiAccess) return // Already initialized
          try {
            if (!(navigator as any).requestMIDIAccess) {
              console.warn('[MIDI] Web MIDI API not supported in this environment.')
              return
            }
            midiAccess = await (navigator as any).requestMIDIAccess()
            console.log('[MIDI] Access granted. Inputs:', midiAccess.inputs.size)
            
            midiAccess.inputs.forEach((input: any) => {
              input.onmidimessage = handleMidiMessage
            })

            midiAccess.onstatechange = (e: any) => {
              if (e.port.type === 'input' && e.port.state === 'connected') {
                const input = e.port
                input.onmidimessage = handleMidiMessage
                console.log(`[MIDI] Connected: ${input.name}`)
              }
            }
          } catch (err) {
            console.error('[MIDI] Failed to initialize:', err)
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
