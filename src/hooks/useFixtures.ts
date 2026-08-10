import { useState, useCallback, useEffect } from 'react'
import type {
  FixtureProfile, PatchedFixture, FixtureLogicalState,
  ProfileEntry, ChannelType,
} from '@/types/fixtures'
import { DEFAULT_LOGICAL_STATE } from '@/types/fixtures'

// ─────────────────────────────────────────────────────────────────────────────
// useFixtures — manages all fixture state for the renderer.
//
// Follows the same optimistic-update pattern as useDmx:
//  • Local state updates immediately (for instant UI feedback)
//  • IPC call propagates to FixtureManager → DmxEngine on next tick (~23ms)
// ─────────────────────────────────────────────────────────────────────────────

// Re-export for convenience
export type { FixtureProfile, PatchedFixture, ProfileEntry, FixtureLogicalState }

export function useFixtures() {
  const [profiles, setProfiles] = useState<ProfileEntry[]>([])
  const [patch,    setPatch]    = useState<PatchedFixture[]>([])
  const [states,   setStates]   = useState<Record<string, FixtureLogicalState>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // ── Initial load ──────────────────────────────────────────────────────────

  const loadProfiles = useCallback(async () => {
    setIsLoading(true)
    const result = await window.fixtureAPI.getProfiles()
    setIsLoading(false)
    if (result.success && result.profiles) setProfiles(result.profiles)
    else setError(result.error ?? 'Failed to load profiles')
  }, [])

  const loadPatch = useCallback(async () => {
    const result = await window.fixtureAPI.getPatch()
    if (result.success && result.patch) setPatch(result.patch)
  }, [])

  const loadStates = useCallback(async () => {
    const result = await window.fixtureAPI.getStates()
    if (result.success && result.states) setStates(result.states)
  }, [])

  useEffect(() => {
    Promise.all([loadProfiles(), loadPatch(), loadStates()])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Profile management ─────────────────────────────────────────────────────

  const saveProfile = useCallback(async (profile: FixtureProfile): Promise<string | null> => {
    setIsLoading(true)
    setError(null)
    const result = await window.fixtureAPI.saveProfile(profile)
    setIsLoading(false)
    if (result.success && result.key) {
      await loadProfiles()
      return result.key
    }
    setError(result.error ?? 'Failed to save profile')
    return null
  }, [loadProfiles])

  const deleteProfile = useCallback(async (key: string) => {
    await window.fixtureAPI.deleteProfile(key)
    setProfiles(prev => prev.filter(p => p.key !== key))
  }, [])

  // ── Patch management ───────────────────────────────────────────────────────

  const patchFixture = useCallback(async (
    profileKey: string, startAddress: number, label?: string, universeIndex?: number
  ): Promise<PatchedFixture | null> => {
    setError(null)
    const result = await window.fixtureAPI.patchFixture(profileKey, startAddress, label, universeIndex)
    if (result.success && result.fixture) {
      const newFixture = result.fixture
      setPatch(prev => [...prev, newFixture])
      // Initialise local logical state for this new fixture
      setStates(prev => ({ ...prev, [newFixture.id]: { ...DEFAULT_LOGICAL_STATE } }))
      return newFixture
    }
    setError(result.error ?? 'Failed to patch fixture')
    return null
  }, [])

  const removePatch = useCallback(async (id: string) => {
    await window.fixtureAPI.removePatch(id)
    setPatch(prev => prev.filter(f => f.id !== id))
    setStates(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const setFixturePosition = useCallback(async (id: string, pos: [number, number, number]) => {
    setPatch(prev => prev.map(f => f.id === id ? { ...f, position3d: pos } : f))
    await window.fixtureAPI.setPosition(id, pos)
  }, [])

  const setFixtureRotation = useCallback(async (id: string, rot: [number, number, number]) => {
    setPatch(prev => prev.map(f => f.id === id ? { ...f, rotation3d: rot } : f))
    await window.fixtureAPI.setRotation(id, rot)
  }, [])

  const setFixtureUniverse = useCallback(async (id: string, universeIdx: number) => {
    setPatch(prev => prev.map(f => f.id === id ? { ...f, universeIndex: universeIdx } : f))
    await window.fixtureAPI.setUniverse(id, universeIdx)
  }, [])

  // ── Logical commands ───────────────────────────────────────────────────────

  const sendCommand = useCallback(async (fixtureId: string, type: ChannelType, value: number) => {
    // Optimistic local update
    setStates(prev => {
      const state = prev[fixtureId]
      if (!state) return prev
      const stateKey = channelTypeToStateKey(type)
      if (!stateKey) return prev
      return { ...prev, [fixtureId]: { ...state, [stateKey]: value } }
    })
    await window.fixtureAPI.sendCommand(fixtureId, type, value)
  }, [])

  const sendColor = useCallback(async (
    fixtureId: string, r: number, g: number, b: number, w = 0,
  ) => {
    // Optimistic local update for all colour channels at once
    setStates(prev => {
      const state = prev[fixtureId]
      if (!state) return prev
      return { ...prev, [fixtureId]: { ...state, r, g, b, w } }
    })
    await window.fixtureAPI.sendColor(fixtureId, r, g, b, w)
  }, [])

  return {
    profiles, patch, states,
    isLoading, error,
    loadProfiles, loadPatch,
    saveProfile, deleteProfile,
    patchFixture, removePatch,
    setFixturePosition,
    setFixtureRotation,
    setFixtureUniverse,
    sendCommand, sendColor,
  }
}

// ── Internal helper ──────────────────────────────────────────────────────────

function channelTypeToStateKey(type: ChannelType): keyof FixtureLogicalState | null {
  const map: Partial<Record<ChannelType, keyof FixtureLogicalState>> = {
    Intensity: 'intensity',
    Red: 'r', Green: 'g', Blue: 'b', White: 'w',
    Smoke: 'smoke', Pan: 'pan', Tilt: 'tilt',
    Shutter: 'shutter', Strobe: 'shutter',
    Speed: 'speed', Effect: 'effect', Color: 'color',
  }
  return map[type] ?? null
}

// Export DEFAULT_LOGICAL_STATE for component use
export { DEFAULT_LOGICAL_STATE }
