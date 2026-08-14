import { create } from 'zustand'

export interface DmxState {
  universes: Uint8Array[]
  universe: Uint8Array // Alias for universes[0]
  engineBypassed: boolean
  isBlindMode: boolean
  
  updateChannel: (channel: number, value: number, universeIdx?: number) => Promise<void>
  updateChannels: (channelMap: Record<number, number>, universeIdx?: number) => Promise<void>
  blackout: () => Promise<void>
  setEngineBypass: (bypass: boolean) => Promise<void>
  setBlindMode: (blind: boolean) => Promise<void>
  init: () => () => void // Returns cleanup function
}

export const useDmxStore = create<DmxState>((set, get) => ({
  universes: Array.from({ length: 8 }, () => new Uint8Array(512)),
  get universe() { return get().universes[0] },
  engineBypassed: false,
  isBlindMode: false,

  updateChannel: async (channel, value, universeIdx = 0) => {
    const safeVal = Math.max(0, Math.min(255, value))
    const u = Math.max(0, Math.min(7, universeIdx))
    set((state) => {
      const next = state.universes.map(u => new Uint8Array(u))
      next[u][channel - 1] = safeVal
      return { universes: next, universe: next[0] }
    })
    await window.dmxAPI.updateChannel(channel, safeVal, u)
  },

  updateChannels: async (channelMap, universeIdx = 0) => {
    const u = Math.max(0, Math.min(7, universeIdx))
    set((state) => {
      const next = state.universes.map(u => new Uint8Array(u))
      for (const [ch, val] of Object.entries(channelMap)) {
        next[u][Number(ch) - 1] = Math.max(0, Math.min(255, val))
      }
      return { universes: next, universe: next[0] }
    })
    await window.dmxAPI.updateChannels(channelMap, u)
  },

  blackout: async () => {
    const emptyUniverses = Array.from({ length: 8 }, () => new Uint8Array(512))
    set({ universes: emptyUniverses, universe: emptyUniverses[0] })
    await window.dmxAPI.blackout()
  },

  setEngineBypass: async (bypass: boolean) => {
    set({ engineBypassed: bypass })
    await window.dmxAPI.setEngineBypass(bypass)
  },

  setBlindMode: async (blind: boolean) => {
    set({ isBlindMode: blind })
    await window.dmxAPI.setBlindMode(blind)
  },

  init: () => {
    const unsubscribe = window.dmxAPI.onUniverseUpdate((newUniverse: Uint8Array) => {
      set((state) => {
        const next = [...state.universes]
        // Since newUniverse is already a Uint8Array provided by IPC, we can just use it directly
        next[0] = newUniverse
        return { universes: next, universe: next[0] }
      })
    })
    return unsubscribe
  }
}))
