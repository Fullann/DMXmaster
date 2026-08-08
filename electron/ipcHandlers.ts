import { ipcMain, WebContents } from 'electron'
import type { DmxEngine }      from './dmxEngine'
import type { SerialManager }  from './serialManager'
import type { FixtureManager } from './fixtureManager'
import type { SceneManager }   from './sceneManager'
import type { ChaserManager }  from './chaserManager'
import type { EffectsEngine }  from './effectsEngine'
import type { LiveGridManager } from './liveGridManager'
import type { AudioEngine }    from './audioEngine'
import type { NetworkManager } from './networkManager'
import type { PixelEngine }    from './pixelEngine'
import type { TimelineManager} from './timelineManager'
import type { ShowManager }    from './showManager'
import type { FixtureProfile, ChannelType } from './fixtureTypes'
import type { FxConfig }       from './fxTypes'
import type { Chaser }         from './chaserTypes'
import type { ParameterGroup } from './sceneTypes'

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handler Registry
//
//  ┌──────────────────────────────────────┬──────────────────────────────────┐
//  │ Channel                              │ Description                      │
//  ├──────────────────────────────────────┼──────────────────────────────────┤
//  │ dmx:listPorts / connect / disconnect │ Serial port management           │
//  │ dmx:updateChannel / updateChannels   │ Raw universe mutation            │
//  │ dmx:getUniverse / blackout           │ Universe reads + blackout        │
//  ├──────────────────────────────────────┼──────────────────────────────────┤
//  │ fixture:getProfiles / saveProfile    │ Profile file management          │
//  │ fixture:deleteProfile / reload       │                                  │
//  │ fixture:getPatch / patchFixture      │ Patch management                 │
//  │ fixture:removePatch                  │                                  │
//  │ fixture:sendCommand / sendColor      │ Logical commands                 │
//  │ fixture:getStates / clearAll         │ State queries + programmer clear │
//  ├──────────────────────────────────────┼──────────────────────────────────┤
//  │ scene:getScenes / getScene           │ Scene list + detail              │
//  │ scene:saveCurrentAsScene             │ Capture current state            │
//  │ scene:recallScene                    │ Trigger crossfade recall         │
//  │ scene:deleteScene                    │ Remove a saved scene             │
//  │ scene:cancelFade                     │ Abort an in-progress fade        │
//  │ scene:getFadeStatus                  │ Current crossfade progress       │
//  ├──────────────────────────────────────┼──────────────────────────────────┤
//  │ fx:addEffect                         │ Starts a new LFO effect          │
//  │ fx:removeEffect                      │ Stops a specific effect          │
//  │ fx:clearAll                          │ Stops all active effects         │
//  │ fx:getEffects                        │ Lists active effects             │
//  ├──────────────────────────────────────┼──────────────────────────────────┤
//  │ grid:get                             │ Fetch Live Busking Grid config   │
//  │ grid:save                            │ Save Live Busking Grid config    │
//  ├──────────────────────────────────────┼──────────────────────────────────┤
//  │ audio:updateBands                    │ Stream live FFT data (low/mid/hi)│
//  │ audio:addTrigger                     │ Create a sound-to-light trigger  │
//  │ audio:removeTrigger                  │ Remove a trigger                 │
//  │ audio:getTriggers                    │ Fetch active audio triggers      │
//  ├──────────────────────────────────────┼──────────────────────────────────┤
//  │ network:getConfig                    │ Get WLED nodes & broadcast state │
//  │ network:saveConfig                   │ Save network config              │
//  ├──────────────────────────────────────┼──────────────────────────────────┤
//  │ pixel:updateFrame                    │ Stream live RGB Uint8Array       │
//  │ pixel:getConfig                      │ Get matrices config              │
//  │ pixel:saveConfig                     │ Save matrices config             │
//  ├──────────────────────────────────────┼──────────────────────────────────┤
//  │ timeline:getShows                    │ Fetch all shows                  │
//  │ timeline:saveShow                    │ Save a show                      │
//  │ timeline:deleteShow                  │ Delete a show                    │
//  │ timeline:importAudio                 │ Import external MP3/WAV          │
//  │ timeline:getAudioBuffer              │ Get raw ArrayBuffer for Web Audio│
//  ├──────────────────────────────────────┼──────────────────────────────────┤
//  │ app:exportShow                       │ Zip and export .dmxshow          │
//  │ app:importShow                       │ Import and extract .dmxshow      │
//  │ app:newShow                          │ Factory reset all configs        │
//  └──────────────────────────────────────┴──────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────

function handle(channel: string, fn: (...args: unknown[]) => Promise<unknown> | unknown) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      const data = await fn(...args)
      return { success: true, ...(data !== undefined ? { data } : {}) }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[IPC] ${channel} error:`, message)
      return { success: false, error: message }
    }
  })
}

export function registerIpcHandlers(
  engine:  DmxEngine,
  serial:  SerialManager,
  fixture: FixtureManager,
  scene:   SceneManager,
  chaser:  ChaserManager,
  fx:      EffectsEngine,
  grid:    LiveGridManager,
  audio:   AudioEngine,
  network: NetworkManager,
  pixel:   PixelEngine,
  timeline:TimelineManager,
  show:    ShowManager,
): void {

  // ── Serial ──────────────────────────────────────────────────────────────────

  handle('dmx:listPorts',   async ()         => ({ ports: await serial.listPorts() }))
  handle('dmx:connect',     async (portPath) => { await serial.connect(portPath as string) })
  handle('dmx:disconnect',  async ()         => { await serial.disconnect() })

  // ── Raw DMX universe ────────────────────────────────────────────────────────

  handle('dmx:updateChannel',  (_e, ch, val, u)  => { engine.setChannel(ch as number, val as number, u as number) })
  handle('dmx:updateChannels', (_e, map, u)       => { engine.setChannels(map as Record<number, number>, u as number) })
  handle('dmx:getUniverse',    (u)              => ({ universe: engine.getUniverseSnapshot(u as number) }))
  handle('dmx:getUniverses',   ()               => ({ universes: engine.getAllUniverseSnapshots() }))
  handle('dmx:blackout',       ()              => { engine.blackout() })
  /**
   * Soft (intensity-only) blackout — zeros intensity in the fixture logical
   * layer without clearing colour or position values.
   */
  handle('dmx:softBlackout',   ()              => { fixture.softBlackout() })


  // ── Fixtures & Patching & Groups ────────────────────────────────────────────

  handle('fixture:getProfiles', () => ({ profiles: fixture.getProfiles() }))
  handle('fixture:reloadProfiles', async () => { await fixture.loadProfiles(); return { profiles: fixture.getProfiles() } })
  handle('fixture:saveProfile', async (e, p) => ({ key: await fixture.saveProfile(p as FixtureProfile) }))
  handle('fixture:deleteProfile', (e, id) => fixture.deleteProfile(id as string))
  handle('fixture:getPatch', () => ({ patch: fixture.getPatch() }))
  handle('fixture:savePatch', (e, p) => fixture.savePatch(p as any))
  
  handle('fixture:getGroups', () => ({ groups: fixture.getGroups() }))
  handle('fixture:saveGroups', (e, g) => fixture.saveGroups(g as any))
  
  // Fire-and-forget (ipcRenderer.send in preload) — do NOT use handle() here
  ipcMain.on('fixture:setGrandMaster', (_e, level) => { fixture.setGrandMaster(level as number) })
  ipcMain.on('fixture:setSubmaster',   (_e, groupId, level) => { fixture.setSubmaster(groupId as string, level as number) })

  // ── Patch ───────────────────────────────────────────────────────────────────

  handle('fixture:patchFixture',    (key, addr, label, uIdx) => ({ fixture: fixture.patchFixture(key as string, addr as number, label as string, uIdx as number) }))
  handle('fixture:removePatch',     (id)                  => { fixture.removePatchedFixture(id as string) })
  handle('fixture:setPosition',     async (id, pos)       => { await fixture.setFixturePosition(id as string, pos as [number, number, number]) })
  handle('fixture:setUniverse',     async (id, uIdx)      => { await fixture.setFixtureUniverse(id as string, uIdx as number) })

  // ── Logical commands ────────────────────────────────────────────────────────

  handle('fixture:sendCommand', (id, type, val) => { fixture.sendCommand(id as string, type as ChannelType, val as number) })
  handle('fixture:sendColor',   (id, r, g, b, w) => { fixture.sendColor(id as string, r as number, g as number, b as number, (w as number) ?? 0) })
  handle('fixture:getStates',   ()               => ({ states: fixture.getFixtureStates() }))
  handle('fixture:clearAll',    ()               => { fixture.clearAll() })
  handle('fixture:setStates',   (statesMap)      => { fixture.setLogicalStates(statesMap as Record<string, Record<string, number>>) })

  // ── Scenes ──────────────────────────────────────────────────────────────────

  handle('scene:getScenes', () => ({ scenes: scene.getScenes() }))

  handle('scene:getScene', (id) => {
    const s = scene.getScene(id as string)
    if (!s) throw new Error(`Scene not found: ${id}`)
    return { scene: s }
  })

  handle('scene:saveCurrentAsScene', async (name, fadeTimeMs, filterMask) => {
    const s = await scene.saveCurrentAsScene(
      name as string,
      fadeTimeMs as number,
      (filterMask as ParameterGroup | undefined) ?? 'all',
    )
    return { scene: s }
  })

  handle('scene:recallScene', (id) => {
    scene.recallScene(id as string)
  })

  handle('scene:deleteScene', async (id) => {
    await scene.deleteScene(id as string)
  })

  handle('scene:cancelFade', () => {
    scene.cancelFade()
  })

  handle('scene:getFadeStatus', () => ({ status: scene.getFadeStatus() }))

  // ── Chasers ──────────────────────────────────────────────────────────────────

  handle('chaser:getChasers',  ()       => ({ chasers: chaser.getChasers() }))
  handle('chaser:getChaser',   (id)     => {
    const c = chaser.getChaser(id as string)
    if (!c) throw new Error(`Chaser not found: ${id}`)
    return { chaser: c }
  })
  handle('chaser:saveChaser',  async (c) => ({ chaser: await chaser.saveChaser(c as Chaser) }))
  handle('chaser:deleteChaser',async (id) => { await chaser.deleteChaser(id as string) })
  handle('chaser:start',       (id)     => { chaser.start(id as string) })
  handle('chaser:stop',        ()       => { chaser.stop() })
  handle('chaser:setBpm',      (bpm)    => { chaser.setBpm(bpm as number) })
  handle('chaser:tapTempo',    (nowMs)  => ({ bpm: chaser.tapTempo(nowMs as number) }))
  handle('chaser:getStatus',   ()       => ({ status: chaser.getStatus() }))

  // ── FX ──────────────────────────────────────────────────────────────────────

  handle('fx:addEffect',    (cfg) => ({ id: fx.addEffect(cfg as FxConfig) }))
  handle('fx:removeEffect', (id)  => { fx.removeEffect(id as string) })
  handle('fx:clearAll',     ()    => { fx.clearAll() })
  handle('fx:getEffects',   ()    => ({ effects: fx.getEffects() }))

  // ── Grid (multi-page) ──────────────────────────────────────────────────────

  handle('grid:getPages',   ()                   => ({ pages: grid.getPages() }))
  handle('grid:getPage',    (pageIdx)             => ({ page: grid.getPage(pageIdx as number) }))
  handle('grid:savePage',   async (pageIdx, cfg)  => { await grid.savePage(pageIdx as number, cfg as any) })
  handle('grid:saveAll',    async (pages)          => { await grid.saveAllPages(pages as any) })

  // Legacy single-page compat (used by old saves)
  handle('grid:get',  ()      => ({ grid: grid.getPage(0) }))
  handle('grid:save', async (cfg) => { await grid.savePage(0, cfg as any) })

  // ── Audio ───────────────────────────────────────────────────────────────────
  
  handle('audio:updateBands', (e, l, m, h) => { audio.updateBands(l, m, h) })
  handle('audio:addTrigger',  (e, t)       => ({ id: audio.addTrigger(t as any) }))
  handle('audio:removeTrigger',(e, id)     => { audio.removeTrigger(id as string) })
  handle('audio:getTriggers', ()           => ({ triggers: audio.getTriggers() }))

  // ── Network ─────────────────────────────────────────────────────────────────
  
  handle('network:getConfig', ()    => ({ config: network.getConfig() }))
  handle('network:saveConfig',(e,c) => { network.saveConfig(c as any) })

  // ── Pixel Mapping ───────────────────────────────────────────────────────────
  
  handle('pixel:updateFrame', (e, id, buf) => { pixel.updateFrame(id, buf as Uint8Array) }) // Fire & forget
  handle('pixel:getConfig',   ()           => ({ config: pixel.getConfig() }))
  handle('pixel:saveConfig',  (e, c)       => { pixel.saveConfig(c as any) })

  // ── Timeline & Show ─────────────────────────────────────────────────────────

  handle('timeline:getShows',   ()       => timeline.getShows().then(s => ({ shows: s })))
  handle('timeline:saveShow',   (e, s)   => timeline.saveShow(s as any).then(() =>({})))
  handle('timeline:deleteShow', (e, id)  => timeline.deleteShow(id as string).then(() =>({})))
  handle('timeline:importAudio',(e, p)   => timeline.importAudio(p as string).then(f => ({ fileName: f })))
  
  ipcMain.handle('timeline:getAudioBuffer', async (e, fileName: string) => {
    try {
      const p = timeline.getAudioPath(fileName)
      const fs = require('fs')
      const buffer = fs.readFileSync(p)
      return { success: true, buffer: buffer.buffer } // return raw ArrayBuffer
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Application & Show Management ───────────────────────────────────────────

  handle('app:exportShow', () => show.exportShow())
  handle('app:importShow', () => show.importShow())
  handle('app:newShow',    () => show.newShow())

  console.log('[IPC] All Core + DMX + Scene + Chaser + FX + Grid + Audio + Network + Pixel + Timeline + App handlers registered.')
}

// ── Push helpers (main → renderer) ───────────────────────────────────────────

export function pushUniverseUpdate(webContents: WebContents, universe: number[]): void {
  if (!webContents.isDestroyed()) {
    webContents.send('dmx:universeUpdate', universe)
  }
}
