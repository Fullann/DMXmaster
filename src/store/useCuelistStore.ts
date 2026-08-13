import { create } from 'zustand'
import type { Cuelist, CuelistPlaybackState } from '@/types/cuelist'

interface CuelistState {
  cuelists: Cuelist[]
  playback: CuelistPlaybackState

  loadCuelists: () => Promise<void>
  saveCuelists: (cuelists: Cuelist[]) => Promise<void>
  addCuelist: (name: string) => Promise<void>
  deleteCuelist: (id: string) => Promise<void>
  
  go: (cuelistId: string) => void
  stop: () => void
  goto: (cuelistId: string, cueId: string) => void
  
  initListener: () => void
}

export const useCuelistStore = create<CuelistState>((set, get) => ({
  cuelists: [],
  playback: {
    activeCuelistId: null,
    currentCueId: null,
    nextCueId: null,
    state: 'stopped'
  },

  loadCuelists: async () => {
    const res = await window.cuelistAPI.getAll()
    if (res.success && res.cuelists) {
      set({ cuelists: res.cuelists })
    }
  },

  saveCuelists: async (cuelists) => {
    set({ cuelists })
    await window.cuelistAPI.save(cuelists)
  },

  addCuelist: async (name) => {
    const { cuelists, saveCuelists } = get()
    const newCuelist: Cuelist = { id: crypto.randomUUID(), name, cues: [] }
    await saveCuelists([...cuelists, newCuelist])
  },

  deleteCuelist: async (id) => {
    const { cuelists, saveCuelists } = get()
    await saveCuelists(cuelists.filter(c => c.id !== id))
  },

  go: (cuelistId) => {
    window.cuelistAPI.go(cuelistId)
  },
  
  stop: () => {
    window.cuelistAPI.stop()
  },
  
  goto: (cuelistId, cueId) => {
    window.cuelistAPI.goto(cuelistId, cueId)
  },

  initListener: () => {
    window.cuelistAPI.onPlaybackState((state) => {
      set({ playback: state })
    })
  }
}))
