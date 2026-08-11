import type { WebContents } from 'electron'
import type { DmxEngine } from '../dmxEngine'
import type { FixtureManager } from '../fixtureManager'
import { handle } from './ipcUtils'

export function registerDmxIpc(engine: DmxEngine, fixture: FixtureManager): void {
  handle('dmx:updateChannel',  (ch, val, u)  => { engine.setChannel(ch as number, val as number, u as number) })
  handle('dmx:updateChannels', (map, u)       => { engine.setChannels(map as Record<number, number>, u as number) })
  handle('dmx:getUniverse',    (u)              => ({ universe: engine.getUniverseSnapshot(u as number) }))
  handle('dmx:getUniverses',   ()               => ({ universes: engine.getAllUniverseSnapshots() }))
  handle('dmx:blackout',       ()              => { engine.blackout() })
  handle('dmx:setEngineBypass',(bypass)        => { engine.engineBypassed = bypass as boolean })
  handle('dmx:setMasterSpeed', (speed)         => { engine.setMasterSpeed(speed as number) })
  handle('dmx:setMasterSize',  (size)          => { engine.setMasterSize(size as number) })
  handle('dmx:setAllPaused',   (paused)        => { engine.setAllPaused(paused as boolean) })
  
  /**
   * Soft (intensity-only) blackout — zeros intensity in the fixture logical
   * layer without clearing colour or position values.
   */
  handle('dmx:softBlackout',   ()              => { fixture.softBlackout() })
}

export function pushUniverseUpdate(webContents: WebContents, universe: Uint8Array): void {
  if (!webContents.isDestroyed()) {
    webContents.send('dmx:universeUpdate', universe)
  }
}
