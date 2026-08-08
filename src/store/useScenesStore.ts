import { create } from 'zustand'
import type { Scene, FadeStatus, ParameterGroup } from '@/types/scenes'

export interface ScenesState {
  scenes: Scene[]
  isLoading: boolean
  error: string | null
  activeId: string | null
  fadeStatus: FadeStatus

  loadScenes: () => Promise<void>
  saveCurrentAsScene: (name: string, fadeTimeMs: number, filterMask?: ParameterGroup) => Promise<Scene | null>
  recallScene: (id: string) => Promise<void>
  deleteScene: (id: string) => Promise<void>
  cancelFade: () => Promise<void>
  clearProgrammer: () => Promise<void>
  
  _rafRef: number | null
  _startFadeRaf: (sceneId: string, sceneName: string, fadeTimeMs: number) => void
  _stopFadeRaf: () => void
  init: () => void
}

export const useScenesStore = create<ScenesState>((set, get) => ({
  scenes: [],
  isLoading: false,
  error: null,
  activeId: null,
  fadeStatus: { isActive: false, sceneId: null, sceneName: null, fadeTimeMs: 0, elapsedMs: 0, progress: 0 },

  _rafRef: null,

  _stopFadeRaf: () => {
    const raf = get()._rafRef
    if (raf !== null) {
      cancelAnimationFrame(raf)
      set({ _rafRef: null })
    }
  },

  _startFadeRaf: (sceneId, sceneName, fadeTimeMs) => {
    get()._stopFadeRaf()
    const fadeStart = performance.now()

    const tick = () => {
      const elapsed = performance.now() - fadeStart
      const progress = Math.min(1, elapsed / fadeTimeMs)
      set({
        fadeStatus: {
          isActive: true,
          sceneId,
          sceneName,
          fadeTimeMs,
          elapsedMs: elapsed,
          progress,
        }
      })
      if (progress < 1) {
        set({ _rafRef: requestAnimationFrame(tick) })
      } else {
        set({ _rafRef: null, fadeStatus: { ...get().fadeStatus, isActive: false, progress: 1 } })
      }
    }
    set({ _rafRef: requestAnimationFrame(tick) })
  },

  loadScenes: async () => {
    set({ isLoading: true, error: null })
    const result = await window.sceneAPI.getScenes()
    if (result.success && result.scenes) set({ scenes: result.scenes, isLoading: false })
    else set({ error: result.error ?? 'Failed to load scenes', isLoading: false })
  },

  saveCurrentAsScene: async (name, fadeTimeMs, filterMask = 'all') => {
    set({ error: null })
    const result = await window.sceneAPI.saveCurrentAsScene(name, fadeTimeMs, filterMask)
    if (result.success && result.scene) {
      set((state) => ({ scenes: [result.scene!, ...state.scenes] }))
      return result.scene
    }
    set({ error: result.error ?? 'Failed to save scene' })
    return null
  },

  recallScene: async (id) => {
    set({ error: null, activeId: id })
    const result = await window.sceneAPI.recallScene(id)
    if (!result.success) {
      set({ error: result.error ?? 'Failed to recall scene' })
      return
    }
    const scene = get().scenes.find(s => s.id === id)
    if (scene && scene.fadeTimeMs > 0) {
      get()._startFadeRaf(id, scene.name, scene.fadeTimeMs)
    } else {
      set({ fadeStatus: { isActive: false, sceneId: id, sceneName: scene?.name ?? null, fadeTimeMs: 0, elapsedMs: 0, progress: 1 } })
    }
  },

  deleteScene: async (id) => {
    const result = await window.sceneAPI.deleteScene(id)
    if (result.success) {
      set((state) => ({
        scenes: state.scenes.filter(s => s.id !== id),
        activeId: state.activeId === id ? null : state.activeId
      }))
    }
  },

  cancelFade: async () => {
    get()._stopFadeRaf()
    set((state) => ({ fadeStatus: { ...state.fadeStatus, isActive: false } }))
    await window.sceneAPI.cancelFade()
  },

  clearProgrammer: async () => {
    await window.fixtureAPI.clearAll()
    set({ activeId: null })
  },

  init: () => {
    get().loadScenes()
  }
}))
