import { contextBridge, ipcRenderer } from 'electron'

// ─────────────────────────────────────────────────────────────────────────────
// Preload — Context Bridge
// Exposes window.dmxAPI, window.fixtureAPI, window.sceneAPI
// ─────────────────────────────────────────────────────────────────────────────

// ── DMX API ──────────────────────────────────────────────────────────────────

export interface PortInfo {
  path: string; manufacturer?: string; serialNumber?: string
  pnpId?: string; locationId?: string; productId?: string; vendorId?: string
}

export interface DmxAPI {
  listPorts:      () => Promise<{ success: boolean; ports?: PortInfo[]; error?: string }>
  connect:        (portPath: string) => Promise<{ success: boolean; error?: string }>
  disconnect:     () => Promise<{ success: boolean; error?: string }>
  updateChannel:  (channel: number, value: number, universeIdx?: number) => Promise<{ success: boolean; error?: string }>
  updateChannels: (channelMap: Record<number, number>, universeIdx?: number) => Promise<{ success: boolean; error?: string }>
  getUniverse:    (universeIdx?: number) => Promise<{ success: boolean; universe?: Uint8Array; error?: string }>
  getUniverses:   () => Promise<{ success: boolean; universes?: Uint8Array[]; error?: string }>
  blackout:       () => Promise<{ success: boolean; error?: string }>
  /** Intensity-only blackout — does NOT clear Color or Position channels */
  softBlackout:   () => Promise<{ success: boolean; error?: string }>
  setEngineBypass:(bypass: boolean) => Promise<{ success: boolean; error?: string }>
  onUniverseUpdate: (cb: (universe: Uint8Array) => void) => () => void
  setMasterSpeed: (speed: number) => Promise<{ success: boolean; error?: string }>
  setMasterSize:  (size: number) => Promise<{ success: boolean; error?: string }>
  setAllPaused:   (paused: boolean) => Promise<{ success: boolean; error?: string }>
}

const dmxAPI: DmxAPI = {
  listPorts:      ()        => ipcRenderer.invoke('dmx:listPorts'),
  connect:        (p)       => ipcRenderer.invoke('dmx:connect', p),
  disconnect:     ()        => ipcRenderer.invoke('dmx:disconnect'),
  updateChannel:  (ch, val, u) => ipcRenderer.invoke('dmx:updateChannel', ch, val, u),
  updateChannels: (map, u)     => ipcRenderer.invoke('dmx:updateChannels', map, u),
  getUniverse:    (u)          => ipcRenderer.invoke('dmx:getUniverse', u),
  getUniverses:   ()           => ipcRenderer.invoke('dmx:getUniverses'),
  blackout:       ()           => ipcRenderer.invoke('dmx:blackout'),
  softBlackout:   ()           => ipcRenderer.invoke('dmx:softBlackout'),
  setEngineBypass:(bypass)     => ipcRenderer.invoke('dmx:setEngineBypass', bypass),
  onUniverseUpdate: (cb) => {
    const listener = (_: Electron.IpcRendererEvent, universe: Uint8Array) => cb(universe)
    ipcRenderer.on('dmx:universeUpdate', listener)
    return () => ipcRenderer.removeListener('dmx:universeUpdate', listener)
  },
  setMasterSpeed: (speed)      => ipcRenderer.invoke('dmx:setMasterSpeed', speed),
  setMasterSize:  (size)       => ipcRenderer.invoke('dmx:setMasterSize', size),
  setAllPaused:   (paused)     => ipcRenderer.invoke('dmx:setAllPaused', paused),
}

contextBridge.exposeInMainWorld('dmxAPI', dmxAPI)

// ── Fixture API ───────────────────────────────────────────────────────────────

import type {
  FixtureProfile, PatchedFixture, FixtureLogicalState, ChannelType, ProfileEntry, FixtureGroup,
} from './fixtureTypes'

export interface FixtureAPI {
  getProfiles:    () => Promise<{ success: boolean; profiles?: ProfileEntry[]; error?: string }>
  saveProfile:    (p: FixtureProfile) => Promise<{ success: boolean; key?: string; error?: string }>
  deleteProfile:  (key: string) => Promise<{ success: boolean; error?: string }>
  reloadProfiles: () => Promise<{ success: boolean; profiles?: ProfileEntry[]; error?: string }>
  getPatch:       () => Promise<{ success: boolean; patch?: PatchedFixture[]; error?: string }>
  patchFixture:   (key: string, addr: number, label?: string, universeIdx?: number) => Promise<{ success: boolean; fixture?: PatchedFixture; error?: string }>
  removePatch:    (id: string) => Promise<{ success: boolean; error?: string }>
  unpatchAll: () => Promise<{ success: boolean; error?: string }>
  setFixtureTransform: (id: string, position: [number, number, number], rotation: [number, number, number]) => Promise<{ success: boolean; error?: string }>
  setPosition: (id: string, pos: [number, number, number]) => Promise<{ success: boolean; error?: string }>
  setRotation: (id: string, rot: [number, number, number]) => Promise<{ success: boolean; error?: string }>
  setUniverse: (id: string, uIdx: number) => Promise<{ success: boolean; error?: string }>
  renameGroup: (id: string, name: string) => Promise<{ success: boolean; error?: string }>
  sendCommand:    (id: string, type: ChannelType, val: number) => Promise<{ success: boolean; error?: string }>
  sendColor:      (id: string, r: number, g: number, b: number, w?: number) => Promise<{ success: boolean; error?: string }>
  getStates:      () => Promise<{ success: boolean; states?: Record<string, FixtureLogicalState>; error?: string }>
  clearAll:       () => Promise<{ success: boolean; error?: string }>
  setStates:      (statesMap: Record<string, Record<string, number>>) => Promise<{ success: boolean; error?: string }>
  getGroups:      () => Promise<{ success: boolean; groups?: FixtureGroup[]; error?: string }>
  saveGroups:     (groups: FixtureGroup[]) => Promise<{ success: boolean; error?: string }>
  setGrandMaster: (level: number) => void
  setSubmaster:   (groupId: string, level: number) => void
}

const fixtureAPI: FixtureAPI = {
  getProfiles:    ()                 => ipcRenderer.invoke('fixture:getProfiles'),
  saveProfile:    (p)                => ipcRenderer.invoke('fixture:saveProfile', p),
  deleteProfile:  (k)                => ipcRenderer.invoke('fixture:deleteProfile', k),
  reloadProfiles: ()                 => ipcRenderer.invoke('fixture:reloadProfiles'),
  getPatch:       ()                 => ipcRenderer.invoke('fixture:getPatch'),
  patchFixture:   (k, a, l, u)       => ipcRenderer.invoke('fixture:patchFixture', k, a, l, u),
  removePatch:    (id)               => ipcRenderer.invoke('fixture:removePatch', id),
  unpatchAll:     ()                 => ipcRenderer.invoke('fixture:unpatchAll'),
  setFixtureTransform: (id, pos, rot)=> ipcRenderer.invoke('fixture:setTransform', id, pos, rot),
  setPosition:    (id, pos)          => ipcRenderer.invoke('fixture:setPosition', id, pos),
  setRotation:    (id, rot)          => ipcRenderer.invoke('fixture:setRotation', id, rot),
  setUniverse:    (id, uIdx)         => ipcRenderer.invoke('fixture:setUniverse', id, uIdx),
  renameGroup:    (id, name)         => ipcRenderer.invoke('fixture:renameGroup', id, name),
  sendCommand:    (id, t, v)         => ipcRenderer.invoke('fixture:sendCommand', id, t, v),
  sendColor:      (id, r, g, b, w)   => ipcRenderer.invoke('fixture:sendColor', id, r, g, b, w),
  getStates:      ()                 => ipcRenderer.invoke('fixture:getStates'),
  clearAll:       ()                 => ipcRenderer.invoke('fixture:clearAll'),
  setStates:      (m)                => ipcRenderer.invoke('fixture:setStates', m),
  getGroups:      ()                 => ipcRenderer.invoke('fixture:getGroups'),
  saveGroups:     (g)                => ipcRenderer.invoke('fixture:saveGroups', g),
  setGrandMaster: (l)                => ipcRenderer.send('fixture:setGrandMaster', l),
  setSubmaster:   (g, l)             => ipcRenderer.send('fixture:setSubmaster', g, l),
}

contextBridge.exposeInMainWorld('fixtureAPI', fixtureAPI)

// ── Scene API ─────────────────────────────────────────────────────────────────

import type { Scene, FadeStatus } from './sceneTypes'

export interface SceneAPI {
  getScenes:          () => Promise<{ success: boolean; scenes?: Scene[]; error?: string }>
  getScene:           (id: string) => Promise<{ success: boolean; scene?: Scene; error?: string }>
  saveCurrentAsScene: (name: string, fadeTimeMs: number, filterMask?: string) => Promise<{ success: boolean; scene?: Scene; error?: string }>
  recallScene:        (id: string) => Promise<{ success: boolean; error?: string }>
  deleteScene:        (id: string) => Promise<{ success: boolean; error?: string }>
  cancelFade:         () => Promise<{ success: boolean; error?: string }>
  getFadeStatus:      () => Promise<{ success: boolean; status?: FadeStatus; error?: string }>
}

const sceneAPI: SceneAPI = {
  getScenes:          ()                    => ipcRenderer.invoke('scene:getScenes'),
  getScene:           (id)                  => ipcRenderer.invoke('scene:getScene', id),
  saveCurrentAsScene: (n, f, m)             => ipcRenderer.invoke('scene:saveCurrentAsScene', n, f, m),
  recallScene:        (id)                  => ipcRenderer.invoke('scene:recallScene', id),
  deleteScene:        (id)                  => ipcRenderer.invoke('scene:deleteScene', id),
  cancelFade:         ()                    => ipcRenderer.invoke('scene:cancelFade'),
  getFadeStatus:      ()                    => ipcRenderer.invoke('scene:getFadeStatus'),
}

contextBridge.exposeInMainWorld('sceneAPI', sceneAPI)

// ── FX API ────────────────────────────────────────────────────────────────────

import type { FxConfig, ActiveEffect } from './fxTypes'

export interface FxAPI {
  addEffect:    (config: FxConfig) => Promise<{ success: boolean; id?: string; error?: string }>
  updateEffect: (id: string, config: FxConfig) => Promise<{ success: boolean; error?: string }>
  setPaused:    (id: string, paused: boolean) => Promise<{ success: boolean; error?: string }>
  removeEffect: (id: string) => Promise<{ success: boolean; error?: string }>
  clearAll:     () => Promise<{ success: boolean; error?: string }>
  getEffects:   () => Promise<{ success: boolean; effects?: ActiveEffect[]; error?: string }>
}

const fxAPI: FxAPI = {
  addEffect:    (cfg: any) => ipcRenderer.invoke('fx:addEffect', cfg),
  updateEffect: (id: string, cfg: any) => ipcRenderer.invoke('fx:updateEffect', id, cfg),
  setPaused:    (id: string, paused: boolean) => ipcRenderer.invoke('fx:setPaused', id, paused),
  removeEffect: (id: string)  => ipcRenderer.invoke('fx:removeEffect', id),
  clearAll:     ()    => ipcRenderer.invoke('fx:clearAll'),
  getEffects:   ()    => ipcRenderer.invoke('fx:getEffects'),
}

contextBridge.exposeInMainWorld('fxAPI', fxAPI)

// ── GRID API ──────────────────────────────────────────────────────────────────

import type { LiveGridState, GridPages } from '../src/types/grid'

export interface GridAPI {
  /** Legacy single-page compat */
  getGrid:   () => Promise<{ success: boolean; grid?: LiveGridState; error?: string }>
  saveGrid:  (state: LiveGridState) => Promise<{ success: boolean; error?: string }>
  /** Multi-page API */
  getPages:  () => Promise<{ success: boolean; pages?: GridPages; error?: string }>
  getPage:   (pageIndex: number) => Promise<{ success: boolean; page?: LiveGridState; error?: string }>
  savePage:  (pageIndex: number, state: LiveGridState) => Promise<{ success: boolean; error?: string }>
  saveAll:   (pages: GridPages) => Promise<{ success: boolean; error?: string }>
}

const gridAPI: GridAPI = {
  getGrid:  ()             => ipcRenderer.invoke('grid:get'),
  saveGrid: (state)        => ipcRenderer.invoke('grid:save', state),
  getPages: ()             => ipcRenderer.invoke('grid:getPages'),
  getPage:  (i)            => ipcRenderer.invoke('grid:getPage', i),
  savePage: (i, state)     => ipcRenderer.invoke('grid:savePage', i, state),
  saveAll:  (pages)        => ipcRenderer.invoke('grid:saveAll', pages),
}

contextBridge.exposeInMainWorld('gridAPI', gridAPI)

// ── AUDIO API ─────────────────────────────────────────────────────────────────

import type { AudioTrigger } from '../electron/audioTypes'

export interface AudioAPI {
  updateBands:   (lows: number, mids: number, highs: number) => void
  addTrigger:    (trigger: Omit<AudioTrigger, 'id'>) => Promise<{ success: boolean; id?: string; error?: string }>
  removeTrigger: (id: string) => Promise<{ success: boolean; error?: string }>
  getTriggers:   () => Promise<{ success: boolean; triggers?: AudioTrigger[]; error?: string }>
}

const audioAPI: AudioAPI = {
  updateBands:   (l, m, h) => ipcRenderer.send('audio:updateBands', l, m, h), // Fire-and-forget
  addTrigger:    (t)       => ipcRenderer.invoke('audio:addTrigger', t),
  removeTrigger: (id)      => ipcRenderer.invoke('audio:removeTrigger', id),
  getTriggers:   ()        => ipcRenderer.invoke('audio:getTriggers'),
}

contextBridge.exposeInMainWorld('audioAPI', audioAPI)


// ── NETWORK API ───────────────────────────────────────────────────────────────

import type { NetworkConfig } from '../electron/networkTypes'

export interface NetworkAPI {
  getConfig:  () => Promise<{ success: boolean; config?: NetworkConfig; error?: string }>
  saveConfig: (config: NetworkConfig) => Promise<{ success: boolean; error?: string }>
}

const networkAPI: NetworkAPI = {
  getConfig:  ()  => ipcRenderer.invoke('network:getConfig'),
  saveConfig: (c) => ipcRenderer.invoke('network:saveConfig', c)
}

contextBridge.exposeInMainWorld('networkAPI', networkAPI)

// ── PIXEL API ─────────────────────────────────────────────────────────────────

import type { PixelConfig } from '../electron/pixelTypes'

export interface PixelAPI {
  updateFrame: (matrixId: string, buffer: Uint8Array) => void
  getConfig:   () => Promise<{ success: boolean; config?: PixelConfig; error?: string }>
  saveConfig:  (config: PixelConfig) => Promise<{ success: boolean; error?: string }>
}

const pixelAPI: PixelAPI = {
  updateFrame: (id, buf) => ipcRenderer.send('pixel:updateFrame', id, buf), // fire and forget
  getConfig:   () => ipcRenderer.invoke('pixel:getConfig'),
  saveConfig:  (c) => ipcRenderer.invoke('pixel:saveConfig', c)
}

contextBridge.exposeInMainWorld('pixelAPI', pixelAPI)

// ── TIMELINE API ──────────────────────────────────────────────────────────────

import type { Show } from '../electron/timelineTypes'

export interface TimelineAPI {
  getShows:       () => Promise<{ success: boolean; shows?: Show[]; error?: string }>
  saveShow:       (show: Show) => Promise<{ success: boolean; error?: string }>
  deleteShow:     (id: string) => Promise<{ success: boolean; error?: string }>
  importAudio:    (filePath: string) => Promise<{ success: boolean; fileName?: string; error?: string }>
  getAudioBuffer: (fileName: string) => Promise<{ success: boolean; buffer?: ArrayBuffer; error?: string }>
}

const timelineAPI: TimelineAPI = {
  getShows:       () => ipcRenderer.invoke('timeline:getShows'),
  saveShow:       (s) => ipcRenderer.invoke('timeline:saveShow', s),
  deleteShow:     (id) => ipcRenderer.invoke('timeline:deleteShow', id),
  importAudio:    (p) => ipcRenderer.invoke('timeline:importAudio', p),
  getAudioBuffer: (f) => ipcRenderer.invoke('timeline:getAudioBuffer', f)
}

contextBridge.exposeInMainWorld('timelineAPI', timelineAPI)

// ── APP API ───────────────────────────────────────────────────────────────────

import type { RecentShow } from '../electron/showManager'

export interface AppAPI {
  exportShow: () => Promise<{ success: boolean; error?: string }>
  importShow: () => Promise<{ success: boolean; error?: string }>
  newShow:    () => Promise<{ success: boolean; error?: string }>
  getRecentShows: () => Promise<{ success: boolean; shows?: RecentShow[]; error?: string }>
  openRecentShow: (filePath: string) => Promise<{ success: boolean; error?: string }>
  openVisualizerWindow: () => Promise<void>
}

const appAPI: AppAPI = {
  exportShow: () => ipcRenderer.invoke('app:exportShow'),
  importShow: () => ipcRenderer.invoke('app:importShow'),
  newShow:    () => ipcRenderer.invoke('app:newShow'),
  getRecentShows: () => ipcRenderer.invoke('app:getRecentShows'),
  openRecentShow: (filePath) => ipcRenderer.invoke('app:openRecentShow', filePath),
  openVisualizerWindow: () => ipcRenderer.invoke('app:openVisualizer'),
}

contextBridge.exposeInMainWorld('appAPI', appAPI)

// ── CHASER API ────────────────────────────────────────────────────────────────

import type { Chaser, ChaserStatus } from '../electron/chaserTypes'

export interface ChaserAPI {
  getChasers:   () => Promise<{ success: boolean; chasers?: Chaser[]; error?: string }>
  getChaser:    (id: string) => Promise<{ success: boolean; chaser?: Chaser; error?: string }>
  saveChaser:   (chaser: Chaser) => Promise<{ success: boolean; chaser?: Chaser; error?: string }>
  deleteChaser: (id: string) => Promise<{ success: boolean; error?: string }>
  start:        (id: string) => Promise<{ success: boolean; error?: string }>
  stop:         () => Promise<{ success: boolean; error?: string }>
  setBpm:       (bpm: number) => Promise<{ success: boolean; error?: string }>
  tapTempo:     (nowMs: number) => Promise<{ success: boolean; bpm?: number; error?: string }>
  getStatus:    () => Promise<{ success: boolean; status?: ChaserStatus; error?: string }>
}

const chaserAPI: ChaserAPI = {
  getChasers:   ()       => ipcRenderer.invoke('chaser:getChasers'),
  getChaser:    (id)     => ipcRenderer.invoke('chaser:getChaser', id),
  saveChaser:   (c)      => ipcRenderer.invoke('chaser:saveChaser', c),
  deleteChaser: (id)     => ipcRenderer.invoke('chaser:deleteChaser', id),
  start:        (id)     => ipcRenderer.invoke('chaser:start', id),
  stop:         ()       => ipcRenderer.invoke('chaser:stop'),
  setBpm:       (bpm)    => ipcRenderer.invoke('chaser:setBpm', bpm),
  tapTempo:     (nowMs)  => ipcRenderer.invoke('chaser:tapTempo', nowMs),
  getStatus:    ()       => ipcRenderer.invoke('chaser:getStatus'),
}

contextBridge.exposeInMainWorld('chaserAPI', chaserAPI)

// ── PALETTE API ───────────────────────────────────────────────────────────────

import type { Palette } from './paletteTypes'

export interface PaletteAPI {
  getPalettes: () => Promise<{ success: boolean; palettes?: Palette[]; error?: string }>
  savePalette: (palette: Partial<Palette>) => Promise<{ success: boolean; palette?: Palette; error?: string }>
  deletePalette: (id: string) => Promise<{ success: boolean; error?: string }>
}

const paletteAPI: PaletteAPI = {
  getPalettes: () => ipcRenderer.invoke('palette:getPalettes'),
  savePalette: (p) => ipcRenderer.invoke('palette:savePalette', p),
  deletePalette: (id) => ipcRenderer.invoke('palette:deletePalette', id),
}

contextBridge.exposeInMainWorld('paletteAPI', paletteAPI)

// ── VIRTUAL CONSOLE API ───────────────────────────────────────────────────────

import type { VirtualConsolePage } from '../../src/types/virtualConsole'

export interface VirtualConsoleAPI {
  getPages: () => Promise<{ success: boolean; pages?: VirtualConsolePage[]; error?: string }>
  savePages: (pages: VirtualConsolePage[]) => Promise<{ success: boolean; error?: string }>
}

const virtualConsoleAPI: VirtualConsoleAPI = {
  getPages: () => ipcRenderer.invoke('virtualConsole:getPages'),
  savePages: (pages) => ipcRenderer.invoke('virtualConsole:savePages', pages),
}

contextBridge.exposeInMainWorld('virtualConsoleAPI', virtualConsoleAPI)

// ── CUELIST API ───────────────────────────────────────────────────────────────

import type { Cuelist, CuelistPlaybackState } from '../src/types/cuelist'

export interface CuelistAPI {
  getAll: () => Promise<{ success: boolean; cuelists?: Cuelist[]; error?: string }>
  save:   (cuelists: Cuelist[]) => Promise<{ success: boolean; error?: string }>
  go:     (cuelistId: string) => Promise<{ success: boolean; error?: string }>
  stop:   () => Promise<{ success: boolean; error?: string }>
  goto:   (cuelistId: string, cueId: string) => Promise<{ success: boolean; error?: string }>
  onPlaybackState: (callback: (state: CuelistPlaybackState) => void) => void
}

const cuelistAPI: CuelistAPI = {
  getAll: () => ipcRenderer.invoke('cuelist:getAll'),
  save:   (cuelists) => ipcRenderer.invoke('cuelist:save', cuelists),
  go:     (id) => ipcRenderer.invoke('cuelist:go', id),
  stop:   () => ipcRenderer.invoke('cuelist:stop'),
  goto:   (cuelistId, cueId) => ipcRenderer.invoke('cuelist:goto', { cuelistId, cueId }),
  onPlaybackState: (callback) => ipcRenderer.on('cuelist:playbackState', (_e, state) => callback(state))
}

contextBridge.exposeInMainWorld('cuelistAPI', cuelistAPI)

// ── Global type augmentation ──────────────────────────────────────────────────

declare global {
  interface Window {
    dmxAPI:     DmxAPI
    fixtureAPI: FixtureAPI
    sceneAPI:   SceneAPI
    fxAPI:      FxAPI
    gridAPI:    GridAPI
    audioAPI:   AudioAPI
    networkAPI: NetworkAPI
    pixelAPI:   PixelAPI
    timelineAPI:TimelineAPI
    appAPI:     AppAPI
    chaserAPI:  ChaserAPI
    paletteAPI: PaletteAPI
    virtualConsoleAPI: VirtualConsoleAPI
    cuelistAPI: CuelistAPI
  }
}
