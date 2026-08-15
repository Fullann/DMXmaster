import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DmxActionType = 
  | { type: 'setGrandMaster' }
  | { type: 'triggerChaser', chaserId: string }
  | { type: 'triggerScene', sceneId: string }
  | { type: 'triggerGridCell', page: number, note: number }
  | { type: 'softBlackout' }

export interface DmxMapping {
  id: string
  universe: number
  channel: number
  action: DmxActionType
  label: string
}

export interface DmxMappingState {
  mappings: DmxMapping[]
  learnMode: boolean
  targetAction: DmxActionType | null
  targetLabel: string | null

  setLearnMode: (active: boolean) => void
  setTargetAction: (action: DmxActionType | null, label?: string) => void
  addMapping: (mapping: Omit<DmxMapping, 'id'>) => void
  removeMapping: (id: string) => void
  clearMappings: () => void
}

export const useDmxMappingStore = create<DmxMappingState>()(
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
          !(m.universe === mapping.universe && m.channel === mapping.channel)
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
      name: 'dmx-in-mappings',
      partialize: (state) => ({ mappings: state.mappings }) // Only persist mappings
    }
  )
)
