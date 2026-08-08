import { useState, useCallback, useEffect, useRef } from 'react'
import type { Chaser, ChaserStatus } from '@/types/chaser'

// ─────────────────────────────────────────────────────────────────────────────
// useChaser — manages Chaser list, playback, and BPM clock for the renderer.
//
// Polls chaser:getStatus at 5Hz while a chaser is running so the step
// progress indicator stays live without flooding IPC.
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_POLL_MS = 200 // 5 Hz

export function useChaser() {
  const [chasers,   setChasers]   = useState<Chaser[]>([])
  const [status,    setStatus]    = useState<ChaserStatus>({
    isRunning: false, chaserId: null, chaserName: null,
    currentStep: 0, totalSteps: 0, bpm: 120, stepProgress: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Status polling ──────────────────────────────────────────────────────────

  const pollStatus = useCallback(async () => {
    const result = await window.chaserAPI.getStatus()
    if (result.success && result.status) setStatus(result.status)
  }, [])

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return
    pollTimerRef.current = setInterval(pollStatus, STATUS_POLL_MS)
  }, [pollStatus])

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  // Poll while running, stop when idle
  useEffect(() => {
    if (status.isRunning) startPolling()
    else stopPolling()
  }, [status.isRunning, startPolling, stopPolling])

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling])

  // Initial BPM sync
  useEffect(() => { pollStatus() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chaser list ─────────────────────────────────────────────────────────────

  const loadChasers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const result = await window.chaserAPI.getChasers()
    setIsLoading(false)
    if (result.success && result.chasers) setChasers(result.chasers)
    else setError(result.error ?? 'Failed to load chasers')
  }, [])

  useEffect(() => { loadChasers() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveChaser = useCallback(async (chaser: Chaser): Promise<Chaser | null> => {
    const result = await window.chaserAPI.saveChaser(chaser)
    if (result.success && result.chaser) {
      setChasers(prev => {
        const idx = prev.findIndex(c => c.id === result.chaser!.id)
        return idx >= 0
          ? prev.map((c, i) => i === idx ? result.chaser! : c)
          : [result.chaser!, ...prev]
      })
      return result.chaser
    }
    setError(result.error ?? 'Failed to save chaser')
    return null
  }, [])

  const deleteChaser = useCallback(async (id: string) => {
    await window.chaserAPI.deleteChaser(id)
    setChasers(prev => prev.filter(c => c.id !== id))
    if (status.chaserId === id) {
      setStatus(prev => ({ ...prev, isRunning: false, chaserId: null }))
    }
  }, [status.chaserId])

  // ── Playback ────────────────────────────────────────────────────────────────

  const startChaser = useCallback(async (id: string) => {
    const result = await window.chaserAPI.start(id)
    if (result.success) {
      // Kick the poll immediately to update step display
      await pollStatus()
      startPolling()
    } else {
      setError(result.error ?? 'Failed to start chaser')
    }
  }, [pollStatus, startPolling])

  const stopChaser = useCallback(async () => {
    await window.chaserAPI.stop()
    stopPolling()
    setStatus(prev => ({ ...prev, isRunning: false, chaserId: null, stepProgress: 0 }))
  }, [stopPolling])

  // ── BPM ─────────────────────────────────────────────────────────────────────

  const setBpm = useCallback(async (bpm: number) => {
    await window.chaserAPI.setBpm(bpm)
    setStatus(prev => ({ ...prev, bpm }))
  }, [])

  const tapTempo = useCallback(async () => {
    const result = await window.chaserAPI.tapTempo(Date.now())
    if (result.success && result.bpm !== undefined) {
      setStatus(prev => ({ ...prev, bpm: result.bpm! }))
    }
  }, [])

  return {
    chasers, status, isLoading, error,
    loadChasers, saveChaser, deleteChaser,
    startChaser, stopChaser,
    setBpm, tapTempo,
  }
}
