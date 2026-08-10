import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FixtureManager } from '../fixtureManager'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('FixtureManager Loading', () => {
  let fm: FixtureManager
  let tempDir: string
  let patchPath: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dmx-test-'))
    patchPath = path.join(tempDir, 'Patch.json')
    fm = new FixtureManager()
    // Mock the paths
    ;(fm as any).patchPath = patchPath
    ;(fm as any).profilesDir = path.join(tempDir, 'Profiles')
    ;(fm as any).groupsPath = path.join(tempDir, 'Groups.json')
    await fs.mkdir((fm as any).profilesDir, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('should initialize states for fixtures loaded from patch', async () => {
    // Write a dummy patch file
    const dummyPatch = [
      {
        id: '123',
        profileKey: 'test',
        profile: { channels: [{ number: 1, type: 'Intensity', defaultValue: 0 }] },
        startAddress: 1,
        label: 'Test',
        universeIndex: 0,
        position3d: [0, 0, 0]
      }
    ]
    await fs.writeFile(patchPath, JSON.stringify(dummyPatch))

    // Call internal _loadPatch
    await (fm as any)._loadPatch()

    const states = fm.getFixtureStates()
    expect(states['123']).toBeDefined()
    expect(states['123'].intensity).toBe(0)
  })
})
