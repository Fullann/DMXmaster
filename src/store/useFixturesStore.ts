import { create } from 'zustand'
import type { FixtureProfile, PatchedFixture, FixtureLogicalState, ProfileEntry, ChannelType } from '@/types/fixtures'
import { DEFAULT_LOGICAL_STATE } from '@/types/fixtures'

export interface FixturesState {
  profiles: ProfileEntry[]
  patch: PatchedFixture[]
  states: Record<string, FixtureLogicalState>
  isLoading: boolean
  error: string | null

  loadProfiles: () => Promise<void>
  loadPatch: () => Promise<void>
  loadStates: () => Promise<void>
  saveProfile: (profile: FixtureProfile) => Promise<string | null>
  deleteProfile: (key: string) => Promise<void>
  patchFixture: (profileKey: string, startAddress: number, label?: string, universeIndex?: number) => Promise<PatchedFixture | null>
  removePatch: (id: string) => Promise<void>
  setFixturePosition: (id: string, pos: [number, number, number]) => Promise<void>
  setFixtureRotation: (id: string, rot: [number, number, number]) => Promise<void>
  setFixtureUniverse: (id: string, universeIdx: number) => Promise<void>
  morphFixture: (id: string, key: string, addr?: number) => Promise<PatchedFixture | null>
  cloneFixture: (src: string, dest: string) => Promise<boolean>
  sendCommand: (fixtureId: string, type: ChannelType, value: number) => Promise<void>
  sendColor: (fixtureId: string, r: number, g: number, b: number, w?: number) => Promise<void>
  init: () => void
}

function channelTypeToStateKey(type: ChannelType): keyof FixtureLogicalState | null {
  const map: Partial<Record<ChannelType, keyof FixtureLogicalState>> = {
    Intensity: 'intensity',
    Red: 'r', Green: 'g', Blue: 'b', White: 'w',
    Smoke: 'smoke', Pan: 'pan', Tilt: 'tilt',
    Shutter: 'shutter', Strobe: 'shutter',
    Speed: 'speed', Effect: 'effect', Color: 'color',
    Gobo: 'gobo', Prism: 'prism', Zoom: 'zoom', Focus: 'focus',
  }
  return map[type] ?? null
}

export const useFixturesStore = create<FixturesState>((set, get) => ({
  profiles: [],
  patch: [],
  states: {},
  isLoading: false,
  error: null,

  loadProfiles: async () => {
    set({ isLoading: true })
    const result = await window.fixtureAPI.getProfiles()
    if (result.success && result.profiles) set({ profiles: result.profiles, isLoading: false })
    else set({ error: result.error ?? 'Failed to load profiles', isLoading: false })
  },

  loadPatch: async () => {
    const result = await window.fixtureAPI.getPatch()
    if (result.success && result.patch) set({ patch: result.patch })
  },

  loadStates: async () => {
    const result = await window.fixtureAPI.getStates()
    if (result.success && result.states) set({ states: result.states })
  },

  saveProfile: async (profile) => {
    set({ isLoading: true, error: null })
    const result = await window.fixtureAPI.saveProfile(profile)
    set({ isLoading: false })
    if (result.success && result.key) {
      await get().loadProfiles()
      return result.key
    }
    set({ error: result.error ?? 'Failed to save profile' })
    return null
  },

  deleteProfile: async (key) => {
    await window.fixtureAPI.deleteProfile(key)
    set((state) => ({ profiles: state.profiles.filter(p => p.key !== key) }))
  },

  patchFixture: async (profileKey, startAddress, label, universeIndex) => {
    set({ error: null })
    const result = await window.fixtureAPI.patchFixture(profileKey, startAddress, label, universeIndex)
    if (result.success && result.fixture) {
      const newFixture = result.fixture
      set((state) => ({
        patch: [...state.patch, newFixture],
        states: { ...state.states, [newFixture.id]: { ...DEFAULT_LOGICAL_STATE } }
      }))
      return newFixture
    }
    set({ error: result.error ?? 'Failed to patch fixture' })
    return null
  },

  removePatch: async (id) => {
    await window.fixtureAPI.removePatch(id)
    set((state) => {
      const nextStates = { ...state.states }
      delete nextStates[id]
      return { patch: state.patch.filter(f => f.id !== id), states: nextStates }
    })
  },

  setFixturePosition: async (id, pos) => {
    await window.fixtureAPI.setPosition(id, pos)
    set((state) => ({ patch: state.patch.map(f => f.id === id ? { ...f, position3d: pos } : f) }))
  },

  setFixtureRotation: async (id, rot) => {
    await window.fixtureAPI.setRotation(id, rot)
    set((state) => ({ patch: state.patch.map(f => f.id === id ? { ...f, rotation3d: rot } : f) }))
  },

  setFixtureUniverse: async (id, universeIdx) => {
    set((state) => ({ patch: state.patch.map(f => f.id === id ? { ...f, universeIndex: universeIdx } : f) }))
    await window.fixtureAPI.setUniverse(id, universeIdx)
  },

  morphFixture: async (id, key, addr) => {
    set({ error: null })
    const result = await window.fixtureAPI.morphFixture(id, key, addr)
    if (result.success && result.fixture) {
      const f = result.fixture
      set((state) => ({ patch: state.patch.map(p => p.id === id ? f : p) }))
      return f
    }
    set({ error: result.error ?? 'Failed to morph fixture' })
    return null
  },

  cloneFixture: async (src, dest) => {
    set({ error: null })
    const result = await window.fixtureAPI.cloneFixture(src, dest)
    if (result.success) return true
    set({ error: result.error ?? 'Failed to clone fixture' })
    return false
  },

  sendCommand: async (fixtureId, type, value) => {
    set((state) => {
      const fstate = state.states[fixtureId]
      if (!fstate) return state
      const stateKey = channelTypeToStateKey(type)
      if (!stateKey) return state
      return { states: { ...state.states, [fixtureId]: { ...fstate, [stateKey]: value } } }
    })
    await window.fixtureAPI.sendCommand(fixtureId, type, value)
  },

  sendColor: async (fixtureId, r, g, b, w = 0) => {
    set((state) => {
      const fstate = state.states[fixtureId]
      if (!fstate) return state
      return { states: { ...state.states, [fixtureId]: { ...fstate, r, g, b, w } } }
    })
    await window.fixtureAPI.sendColor(fixtureId, r, g, b, w)
  },

  init: () => {
    get().loadProfiles()
    get().loadPatch()
    get().loadStates()
  }
}))
