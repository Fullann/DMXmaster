import { create } from 'zustand'
import { useFixturesStore } from './useFixturesStore'

const MAX_HISTORY = 50

interface HistoryEntry {
  label:  string
  states: Record<string, Record<string, number>>
}

export interface HistoryState {
  past: HistoryEntry[]
  future: HistoryEntry[]
  lastLabel: string | null

  push: (label: string, states: Record<string, Record<string, number>>) => void
  pushCurrentState: (label: string) => void
  undo: () => Promise<void>
  redo: () => Promise<void>
  clear: () => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  lastLabel: null,

  pushCurrentState: (label) => {
    const currentStates = useFixturesStore.getState().states
    const currentSnapshot: Record<string, Record<string, number>> = {}
    for (const [id, state] of Object.entries(currentStates)) {
      currentSnapshot[id] = { ...state } as Record<string, number>
    }
    get().push(label, currentSnapshot)
  },

  clear: () => {
    set({ past: [], future: [], lastLabel: null })
  },

  push: (label, states) => {
    set((state) => {
      const entry: HistoryEntry = { label, states }
      const next = [...state.past, entry]
      const nextPast = next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
      return { past: nextPast, future: [], lastLabel: label }
    })
  },

  undo: async () => {
    const { past } = get()
    if (!past.length) return

    const nextPast = [...past]
    const entry = nextPast.pop()!

    const currentStates = useFixturesStore.getState().states
    const currentSnapshot: Record<string, Record<string, number>> = {}
    for (const [id, state] of Object.entries(currentStates)) {
      currentSnapshot[id] = { ...state } as Record<string, number>
    }

    set((state) => ({
      past: nextPast,
      future: [...state.future, { label: entry.label, states: currentSnapshot }],
      lastLabel: `↩ ${entry.label}`
    }))

    window.fixtureAPI.setStates(entry.states).catch(console.error)
  },

  redo: async () => {
    const { future } = get()
    if (!future.length) return

    const nextFuture = [...future]
    const entry = nextFuture.pop()!

    const currentStates = useFixturesStore.getState().states
    const currentSnapshot: Record<string, Record<string, number>> = {}
    for (const [id, state] of Object.entries(currentStates)) {
      currentSnapshot[id] = { ...state } as Record<string, number>
    }

    set((state) => {
      const np = [...state.past, { label: entry.label, states: currentSnapshot }]
      return {
        future: nextFuture,
        past: np.length > MAX_HISTORY ? np.slice(np.length - MAX_HISTORY) : np,
        lastLabel: `↪ ${entry.label}`
      }
    })

    window.fixtureAPI.setStates(entry.states).catch(console.error)
  }
}))
