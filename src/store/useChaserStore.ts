import { create } from 'zustand'
import type { Chaser, ChaserStatus } from '@/types/chaser'

export interface ChaserState {
  chasers: Chaser[]
  status: ChaserStatus
  isLoading: boolean
  error: string | null

  loadChasers: () => Promise<void>
  saveChaser: (chaser: Chaser) => Promise<Chaser | null>
  deleteChaser: (id: string) => Promise<void>
  startChaser: (id: string) => Promise<void>
  stopChaser: () => Promise<void>
  setBpm: (bpm: number) => Promise<void>
  tapTempo: () => Promise<void>
  
  _pollTimerRef: ReturnType<typeof setInterval> | null
  _pollStatus: () => Promise<void>
  _startPolling: () => void
  _stopPolling: () => void
  init: () => void
}

const STATUS_POLL_MS = 200 // 5 Hz

export const useChaserStore = create<ChaserState>((set, get) => ({
  chasers: [],
  status: { isRunning: false, chaserId: null, chaserName: null, currentStep: 0, totalSteps: 0, bpm: 120, stepProgress: 0 },
  isLoading: false,
  error: null,
  _pollTimerRef: null,

  _pollStatus: async () => {
    const result = await window.chaserAPI.getStatus()
    if (result.success && result.status) set({ status: result.status })
  },

  _startPolling: () => {
    if (get()._pollTimerRef) return
    const timer = setInterval(() => get()._pollStatus(), STATUS_POLL_MS)
    set({ _pollTimerRef: timer })
  },

  _stopPolling: () => {
    const timer = get()._pollTimerRef
    if (timer) {
      clearInterval(timer)
      set({ _pollTimerRef: null })
    }
  },

  loadChasers: async () => {
    set({ isLoading: true, error: null })
    const result = await window.chaserAPI.getChasers()
    if (result.success && result.chasers) set({ chasers: result.chasers, isLoading: false })
    else set({ error: result.error ?? 'Failed to load chasers', isLoading: false })
  },

  saveChaser: async (chaser) => {
    const result = await window.chaserAPI.saveChaser(chaser)
    if (result.success && result.chaser) {
      set((state) => {
        const idx = state.chasers.findIndex(c => c.id === result.chaser!.id)
        const nextChasers = idx >= 0
          ? state.chasers.map((c, i) => i === idx ? result.chaser! : c)
          : [result.chaser!, ...state.chasers]
        return { chasers: nextChasers }
      })
      return result.chaser
    }
    set({ error: result.error ?? 'Failed to save chaser' })
    return null
  },

  deleteChaser: async (id) => {
    await window.chaserAPI.deleteChaser(id)
    set((state) => ({
      chasers: state.chasers.filter(c => c.id !== id),
      status: state.status.chaserId === id ? { ...state.status, isRunning: false, chaserId: null } : state.status
    }))
  },

  startChaser: async (id) => {
    const result = await window.chaserAPI.start(id)
    if (result.success) {
      await get()._pollStatus()
      get()._startPolling()
    } else {
      set({ error: result.error ?? 'Failed to start chaser' })
    }
  },

  stopChaser: async () => {
    await window.chaserAPI.stop()
    get()._stopPolling()
    set((state) => ({ status: { ...state.status, isRunning: false, chaserId: null, stepProgress: 0 } }))
  },

  setBpm: async (bpm) => {
    await window.chaserAPI.setBpm(bpm)
    set((state) => ({ status: { ...state.status, bpm } }))
  },

  tapTempo: async () => {
    const result = await window.chaserAPI.tapTempo(Date.now())
    if (result.success && result.bpm !== undefined) {
      set((state) => ({ status: { ...state.status, bpm: result.bpm! } }))
    }
  },

  init: () => {
    get()._pollStatus()
    get().loadChasers()
  }
}))
