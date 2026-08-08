import { useState, useCallback, useEffect, useRef } from 'react'
import type { Scene, FadeStatus } from '@/types/scenes'

// ─────────────────────────────────────────────────────────────────────────────
// useScenes — manages all scene state for the renderer.
//
// Fade progress is tracked locally using a requestAnimationFrame loop —
// this avoids IPC polling while keeping the progress bar smooth.
// The rAF loop starts when a fade begins and stops when it completes.
// ─────────────────────────────────────────────────────────────────────────────

export function useScenes() {
  const [scenes,     setScenes]     = useState<Scene[]>([])
  const [isLoading,  setIsLoading]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [activeId,   setActiveId]   = useState<string | null>(null)

  // Local fade progress (driven by rAF, no IPC polling)
  const [fadeStatus, setFadeStatus] = useState<FadeStatus>({
    isActive: false, sceneId: null, sceneName: null,
    fadeTimeMs: 0, elapsedMs: 0, progress: 0,
  })

  const fadeStartRef  = useRef<number>(0)
  const fadeLengthRef = useRef<number>(0)
  const fadeSIdRef    = useRef<string | null>(null)
  const fadeSNameRef  = useRef<string | null>(null)
  const rafRef        = useRef<number | null>(null)

  // ── rAF-driven fade progress ───────────────────────────────────────────────

  const stopFadeRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const startFadeRaf = useCallback((sceneId: string, sceneName: string, fadeTimeMs: number) => {
    stopFadeRaf()
    fadeStartRef.current  = performance.now()
    fadeLengthRef.current = fadeTimeMs
    fadeSIdRef.current    = sceneId
    fadeSNameRef.current  = sceneName

    const tick = () => {
      const elapsed  = performance.now() - fadeStartRef.current
      const progress = Math.min(1, elapsed / fadeLengthRef.current)
      setFadeStatus({
        isActive: true,
        sceneId:   fadeSIdRef.current,
        sceneName: fadeSNameRef.current,
        fadeTimeMs: fadeLengthRef.current,
        elapsedMs: elapsed,
        progress,
      })
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
        setFadeStatus(prev => ({ ...prev, isActive: false, progress: 1 }))
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [stopFadeRaf])

  // Cleanup on unmount
  useEffect(() => () => stopFadeRaf(), [stopFadeRaf])

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadScenes = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const result = await window.sceneAPI.getScenes()
    setIsLoading(false)
    if (result.success && result.scenes) setScenes(result.scenes)
    else setError(result.error ?? 'Failed to load scenes')
  }, [])

  useEffect(() => { loadScenes() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ─────────────────────────────────────────────────────────────────

  const saveCurrentAsScene = useCallback(async (
    name: string,
    fadeTimeMs: number,
    filterMask = 'all',
  ): Promise<Scene | null> => {
    setError(null)
    const result = await window.sceneAPI.saveCurrentAsScene(name, fadeTimeMs, filterMask)
    if (result.success && result.scene) {
      setScenes(prev => [result.scene!, ...prev])
      return result.scene
    }
    setError(result.error ?? 'Failed to save scene')
    return null
  }, [])


  const recallScene = useCallback(async (id: string) => {
    setError(null)
    setActiveId(id)
    const result = await window.sceneAPI.recallScene(id)
    if (!result.success) {
      setError(result.error ?? 'Failed to recall scene')
      return
    }
    // Start local fade progress tracking
    const scene = scenes.find(s => s.id === id)
    if (scene && scene.fadeTimeMs > 0) {
      startFadeRaf(id, scene.name, scene.fadeTimeMs)
    } else {
      setFadeStatus({ isActive: false, sceneId: id, sceneName: scene?.name ?? null, fadeTimeMs: 0, elapsedMs: 0, progress: 1 })
    }
  }, [scenes, startFadeRaf])

  const deleteScene = useCallback(async (id: string) => {
    const result = await window.sceneAPI.deleteScene(id)
    if (result.success) {
      setScenes(prev => prev.filter(s => s.id !== id))
      if (activeId === id) setActiveId(null)
    }
  }, [activeId])

  const cancelFade = useCallback(async () => {
    stopFadeRaf()
    setFadeStatus(prev => ({ ...prev, isActive: false }))
    await window.sceneAPI.cancelFade()
  }, [stopFadeRaf])

  const clearProgrammer = useCallback(async () => {
    await window.fixtureAPI.clearAll()
    setActiveId(null)
  }, [])

  return {
    scenes, isLoading, error,
    activeId, fadeStatus,
    loadScenes,
    saveCurrentAsScene,
    recallScene,
    deleteScene,
    cancelFade,
    clearProgrammer,
  }
}
