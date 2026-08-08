import { create } from 'zustand'

export interface DmxState {
  universes: number[][]
  universe: number[] // Alias for universes[0]
  
  updateChannel: (channel: number, value: number, universeIdx?: number) => Promise<void>
  updateChannels: (channelMap: Record<number, number>, universeIdx?: number) => Promise<void>
  blackout: () => Promise<void>
  init: () => () => void // Returns cleanup function
}

export const useDmxStore = create<DmxState>((set, get) => ({
  universes: Array.from({ length: 8 }, () => new Array(512).fill(0)),
  get universe() { return get().universes[0] },

  updateChannel: async (channel, value, universeIdx = 0) => {
    const safeVal = Math.max(0, Math.min(255, value))
    const u = Math.max(0, Math.min(7, universeIdx))
    set((state) => {
      const next = [...state.universes]
      next[u] = [...next[u]]
      next[u][channel - 1] = safeVal
      return { universes: next, universe: next[0] }
    })
    await window.dmxAPI.updateChannel(channel, safeVal, u)
  },

  updateChannels: async (channelMap, universeIdx = 0) => {
    const u = Math.max(0, Math.min(7, universeIdx))
    set((state) => {
      const next = [...state.universes]
      next[u] = [...next[u]]
      for (const [ch, val] of Object.entries(channelMap)) {
        next[u][Number(ch) - 1] = Math.max(0, Math.min(255, val))
      }
      return { universes: next, universe: next[0] }
    })
    await window.dmxAPI.updateChannels(channelMap, u)
  },

  blackout: async () => {
    const emptyUniverses = Array.from({ length: 8 }, () => new Array(512).fill(0))
    set({ universes: emptyUniverses, universe: emptyUniverses[0] })
    await window.dmxAPI.blackout()
  },

  init: () => {
    const unsubscribe = window.dmxAPI.onUniverseUpdate((newUniverseOrUniverses: any) => {
      set((state) => {
        if (Array.isArray(newUniverseOrUniverses) && Array.isArray(newUniverseOrUniverses[0])) {
          return { universes: [...newUniverseOrUniverses], universe: newUniverseOrUniverses[0] }
        } else {
          const next = [...state.universes]
          next[0] = [...newUniverseOrUniverses]
          return { universes: next, universe: next[0] }
        }
      })
    })
    return unsubscribe
  }
}))
