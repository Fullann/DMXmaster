import { create } from 'zustand'
import type { FxConfig, ActiveEffect } from '@/types/fx'

export interface FxState {
  activeEffects: ActiveEffect[]
  isLoading: boolean
  error: string | null

  loadEffects: () => Promise<void>
  addEffect: (cfg: FxConfig) => Promise<string | null>
  updateEffect: (id: string, cfg: FxConfig) => Promise<void>
  setPaused: (id: string, paused: boolean) => Promise<void>
  removeEffect: (id: string) => Promise<void>
  clearAll: () => Promise<void>
  refresh: () => Promise<void>
  init: () => void
}

export const useFxStore = create<FxState>((set, get) => ({
  activeEffects: [],
  isLoading: false,
  error: null,

  loadEffects: async () => {
    set({ isLoading: true, error: null })
    const res = await window.fxAPI.getEffects()
    if (res.success && res.effects) set({ activeEffects: res.effects, isLoading: false })
    else set({ error: res.error ?? 'Failed to load effects', isLoading: false })
  },

  addEffect: async (cfg) => {
    const res = await window.fxAPI.addEffect(cfg)
    return res.id ?? null
  },

  updateEffect: async (id, cfg) => {
    await window.fxAPI.updateEffect(id, cfg)
  },

  setPaused: async (id, paused) => {
    await window.fxAPI.setPaused(id, paused)
  },

  removeEffect: async (id) => {
    set({ error: null })
    const res = await window.fxAPI.removeEffect(id)
    if (res.success) await get().loadEffects()
    else set({ error: res.error ?? 'Failed to remove effect' })
  },

  clearAll: async () => {
    set({ error: null })
    const res = await window.fxAPI.clearAll()
    if (res.success) await get().loadEffects()
    else set({ error: res.error ?? 'Failed to clear effects' })
  },

  refresh: () => get().loadEffects(),

  init: () => {
    get().loadEffects()
  }
}))
