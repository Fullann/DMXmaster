import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type MidiActionType = 
  | { type: 'setGrandMaster' }
  | { type: 'triggerChaser', chaserId: string }
  | { type: 'triggerScene', sceneId: string }
  | { type: 'triggerGridCell', page: number, note: number }
  | { type: 'softBlackout' }

export interface MidiMapping {
  id: string
  channel: number
  noteOrCc: number
  isCc: boolean
  action: MidiActionType
  label: string
}

export interface MidiMappingState {
  mappings: MidiMapping[]
  learnMode: boolean
  targetAction: MidiActionType | null
  targetLabel: string | null

  setLearnMode: (active: boolean) => void
  setTargetAction: (action: MidiActionType | null, label?: string) => void
  addMapping: (mapping: Omit<MidiMapping, 'id'>) => void
  removeMapping: (id: string) => void
  clearMappings: () => void
}

export const useMidiMappingStore = create<MidiMappingState>()(
  persist(
    (set) => ({
      mappings: [],
      learnMode: false,
      targetAction: null,
      targetLabel: null,

      setLearnMode: (active) => set({ learnMode: active, targetAction: null, targetLabel: null }),
      
      setTargetAction: (action, label) => set({ targetAction: action, targetLabel: label ?? null }),
      
      addMapping: (mapping) => set((state) => {
        // Remove any existing mapping for this specific hardware control
        const filtered = state.mappings.filter(m => 
          !(m.channel === mapping.channel && m.noteOrCc === mapping.noteOrCc && m.isCc === mapping.isCc)
        )
        return {
          mappings: [...filtered, { ...mapping, id: crypto.randomUUID() }],
          targetAction: null,
          targetLabel: null
        }
      }),
      
      removeMapping: (id) => set((state) => ({ mappings: state.mappings.filter(m => m.id !== id) })),
      
      clearMappings: () => set({ mappings: [] })
    }),
    {
      name: 'dmx-midi-mappings',
      partialize: (state) => ({ mappings: state.mappings }) // Only persist mappings
    }
  )
)
