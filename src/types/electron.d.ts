// ─────────────────────────────────────────────────────────────────────────────
// src/types/electron.d.ts
//
// Window type augmentation for the renderer process.
// Mirrors the DmxAPI shape exposed in electron/preload.ts via contextBridge.
// Kept separate so the renderer tsconfig (which excludes electron/) still gets
// full type safety on window.dmxAPI.
// ─────────────────────────────────────────────────────────────────────────────

export interface PortInfo {
  path: string
  manufacturer?: string
  serialNumber?: string
  pnpId?: string
  locationId?: string
  productId?: string
  vendorId?: string
}

export interface DmxAPI {
  listPorts:      () => Promise<{ success: boolean; ports?: PortInfo[]; error?: string }>
  connect:        (portPath: string) => Promise<{ success: boolean; error?: string }>
  disconnect:     () => Promise<{ success: boolean; error?: string }>
  updateChannel:  (channel: number, value: number) => Promise<{ success: boolean; error?: string }>
  updateChannels: (channelMap: Record<number, number>) => Promise<{ success: boolean; error?: string }>
  getUniverse:    () => Promise<{ success: boolean; universe?: number[]; error?: string }>
  blackout:       () => Promise<{ success: boolean; error?: string }>
  onUniverseUpdate: (callback: (universe: number[]) => void) => () => void
}

import type {
  FixtureProfile, PatchedFixture, FixtureLogicalState, ChannelType, ProfileEntry
} from './fixtures'

export interface FixtureAPI {
  getProfiles:    () => Promise<{ success: boolean; profiles?: ProfileEntry[]; error?: string }>
  saveProfile:    (profile: FixtureProfile) => Promise<{ success: boolean; key?: string; error?: string }>
  deleteProfile:  (key: string) => Promise<{ success: boolean; error?: string }>
  reloadProfiles: () => Promise<{ success: boolean; profiles?: ProfileEntry[]; error?: string }>
  getPatch:       () => Promise<{ success: boolean; patch?: PatchedFixture[]; error?: string }>
  patchFixture:   (profileKey: string, startAddress: number, label?: string) => Promise<{ success: boolean; fixture?: PatchedFixture; error?: string }>
  removePatch:    (id: string) => Promise<{ success: boolean; error?: string }>
  sendCommand:    (fixtureId: string, type: ChannelType, value: number) => Promise<{ success: boolean; error?: string }>
  sendColor:      (fixtureId: string, r: number, g: number, b: number, w?: number) => Promise<{ success: boolean; error?: string }>
  getStates:      () => Promise<{ success: boolean; states?: Record<string, FixtureLogicalState>; error?: string }>
}

import type { VirtualConsolePage } from './virtualConsole'
import type { Cuelist, CuelistPlaybackState } from './cuelist'

export interface VirtualConsoleAPI {
  getPages: () => Promise<{ success: boolean; pages?: VirtualConsolePage[]; error?: string }>
  savePages: (pages: VirtualConsolePage[]) => Promise<{ success: boolean; error?: string }>
}

export interface CuelistAPI {
  getAll: () => Promise<{ success: boolean; cuelists?: Cuelist[]; error?: string }>
  save:   (cuelists: Cuelist[]) => Promise<{ success: boolean; error?: string }>
  go:     (cuelistId: string) => Promise<{ success: boolean; error?: string }>
  stop:   () => Promise<{ success: boolean; error?: string }>
  goto:   (cuelistId: string, cueId: string) => Promise<{ success: boolean; error?: string }>
  onPlaybackState: (callback: (state: CuelistPlaybackState) => void) => void
}

import type { RdmDevice } from './rdm'

export interface RdmAPI {
  discover: () => Promise<{ success: boolean; error?: string }>
  setAddress: (uid: string, newAddress: number) => Promise<{ success: boolean; error?: string }>
  getDevices: () => Promise<{ success: boolean; devices?: RdmDevice[]; error?: string }>
}

declare global {
  interface Window {
    dmxAPI:     DmxAPI
    fixtureAPI: FixtureAPI
    virtualConsoleAPI: VirtualConsoleAPI
    cuelistAPI: CuelistAPI
    rdmAPI: RdmAPI
  }
}
