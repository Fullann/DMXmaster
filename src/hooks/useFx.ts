import { useState, useCallback, useEffect } from 'react'
import type { FxConfig, ActiveEffect } from '@/types/fx'

export function useFx() {
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEffects = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const res = await window.fxAPI.getEffects()
    if (res.success && res.effects) setActiveEffects(res.effects)
    else setError(res.error ?? 'Failed to load effects')
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadEffects()
  }, [loadEffects])

  const addEffect = useCallback(async (config: FxConfig) => {
    setError(null)
    const res = await window.fxAPI.addEffect(config)
    if (res.success) await loadEffects()
    else setError(res.error ?? 'Failed to add effect')
  }, [loadEffects])

  const removeEffect = useCallback(async (id: string) => {
    setError(null)
    const res = await window.fxAPI.removeEffect(id)
    if (res.success) await loadEffects()
    else setError(res.error ?? 'Failed to remove effect')
  }, [loadEffects])

  const clearAll = useCallback(async () => {
    setError(null)
    const res = await window.fxAPI.clearAll()
    if (res.success) await loadEffects()
    else setError(res.error ?? 'Failed to clear effects')
  }, [loadEffects])

  return {
    activeEffects,
    isLoading,
    error,
    addEffect,
    removeEffect,
    clearAll,
    refresh: loadEffects
  }
}
