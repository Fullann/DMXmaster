import { ipcMain, dialog } from 'electron'
import type { FixtureManager } from '../fixtureManager'
import type { SceneManager } from '../sceneManager'
import type { PaletteManager } from '../paletteManager'
import type { FixtureProfile, ChannelType } from '../fixtureTypes'
import { handle } from './ipcUtils'
import { parseGdtf } from '../gdtfParser'

export function registerFixtureIpc(fixture: FixtureManager, scene: SceneManager, palette: PaletteManager): void {
  // Profiles
  handle('fixture:getProfiles', () => ({ profiles: fixture.getProfiles() }))
  handle('fixture:reloadProfiles', async () => { await fixture.loadProfiles(); return { profiles: fixture.getProfiles() } })
  handle('fixture:saveProfile', async (p) => ({ key: await fixture.saveProfile(p as FixtureProfile) }))
  handle('fixture:deleteProfile', (id) => fixture.deleteProfile(id as string))
  
  handle('fixture:importGdtf', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import GDTF Fixture Profile',
      filters: [{ name: 'GDTF Files', extensions: ['gdtf'] }],
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return { success: false, error: 'Canceled' }
    try {
      const profile = parseGdtf(filePaths[0])
      return { success: true, profile }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // Patch
  handle('fixture:getPatch', () => ({ patch: fixture.getPatch() }))
  handle('fixture:savePatch', (p) => fixture.savePatch(p as any))
  handle('fixture:patchFixture',    (key, addr, label, uIdx) => ({ fixture: fixture.patchFixture(key as string, addr as number, label as string, uIdx as number) }))
  handle('fixture:removePatch',     (id)                  => { fixture.removePatchedFixture(id as string) })
  handle('fixture:unpatchAll',      ()                   => fixture.unpatchAll())
  handle('fixture:setTransform',    (id, pos, rot)       => fixture.setFixtureTransform(id as string, pos as [number,number,number], rot as [number,number,number]))
  handle('fixture:setPosition',     async (id, pos)       => { await fixture.setFixturePosition(id as string, pos as [number, number, number]) })
  handle('fixture:setRotation',     async (id, rot)       => { await fixture.setFixtureRotation(id as string, rot as [number, number, number]) })
  handle('fixture:setUniverse',     async (id, uIdx)      => { await fixture.setFixtureUniverse(id as string, uIdx as number) })
  handle('fixture:morphFixture',    async (id, key, addr) => { 
    const f = await fixture.morphFixture(id as string, key as string, addr as number | undefined)
    return { fixture: f }
  })
  handle('fixture:cloneFixture',    async (src, dest) => {
    await fixture.cloneFixtureGroups(src as string, dest as string)
    await scene.cloneFixtureStates(src as string, dest as string)
    await palette.cloneFixtureStates(src as string, dest as string)
    return { success: true }
  })

  // Groups
  handle('fixture:getGroups', () => ({ groups: fixture.getGroups() }))
  handle('fixture:saveGroups', (g) => fixture.saveGroups(g as any))
  handle('fixture:renameGroup', (id, name) => fixture.renameGroup(id as string, name as string))
  
  // Fire-and-forget (ipcRenderer.send in preload) — do NOT use handle() here
  ipcMain.on('fixture:setGrandMaster', (_e, level) => { fixture.setGrandMaster(level as number) })
  ipcMain.on('fixture:setSubmaster',   (_e, groupId, level) => { fixture.setSubmaster(groupId as string, level as number) })

  // Logical commands
  handle('fixture:sendCommand', (id, type, val) => { fixture.sendCommand(id as string, type as ChannelType, val as number) })
  handle('fixture:sendColor',   (id, r, g, b, w) => { fixture.sendColor(id as string, r as number, g as number, b as number, (w as number) ?? 0) })
  handle('fixture:getStates',   ()               => ({ states: fixture.getFixtureStates() }))
  handle('fixture:clearAll',    ()               => { fixture.clearAll() })
  handle('fixture:setStates',   (statesMap)      => { fixture.setLogicalStates(statesMap as Record<string, Record<string, number>>) })
}
