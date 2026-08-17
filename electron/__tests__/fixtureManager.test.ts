import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FixtureManager } from '../fixtureManager'
import * as fs from 'fs'
import path from 'node:path'

// Mock the file system
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
    readdir: vi.fn()
  }
}))

describe('FixtureManager', () => {
  let fixtureManager: FixtureManager

  beforeEach(() => {
    vi.clearAllMocks()
    fixtureManager = new FixtureManager()
    
    // Bypass load initialization for isolation
    fixtureManager['patch'] = []
    fixtureManager['patchPath'] = '/mock/patch.json'
  })

  it('should patch a fixture and create default logical state', async () => {
    // Populate the mock profile
    fixtureManager['profiles'].set('mock-profile', {
      id: 'mock-profile',
      channels: new Array(10),
      mode: '10CH',
      channelMap: { Intensity: 0, Red: 1, Green: 2, Blue: 3 }
    } as any)

    const result = fixtureManager.patchFixture('mock-profile', 1, 'My Test Fixture')
    
    expect(result).toBeDefined()
    expect(fixtureManager.getPatch().length).toBe(1)
  })

  it('should reject a patch if it overlaps with an existing fixture', async () => {
    fixtureManager['profiles'].set('mock-profile', {
      id: 'mock-profile',
      channels: new Array(10),
      mode: '10CH',
      channelMap: {}
    } as any)

    // Patch first fixture at CH 1 (uses CH 1-10)
    fixtureManager.patchFixture('mock-profile', 1, 'Fixture 1')
    
    // Try patching second fixture at CH 5
    expect(() => {
      fixtureManager.patchFixture('mock-profile', 5, 'Fixture 2')
    }).toThrow('Patch conflict')
    
    expect(fixtureManager.getPatch().length).toBe(1) // Should remain 1
  })

  it('should allow patching multiple fixtures if they do not overlap', async () => {
    fixtureManager['profiles'].set('mock-profile', {
      id: 'mock-profile',
      channels: new Array(10),
      mode: '10CH',
      channelMap: {}
    } as any)

    fixtureManager.patchFixture('mock-profile', 1, 'Fixture 1')
    const result = fixtureManager.patchFixture('mock-profile', 11, 'Fixture 2')
    
    expect(result).toBeDefined()
    expect(fixtureManager.getPatch().length).toBe(2)
  })

  it('should save clones visually via setFixtureClones', async () => {
    // Seed patch directly
    const fixtureId = 'test-id'
    fixtureManager['patch'] = [
      { id: fixtureId, label: 'Fixture 1', startAddress: 1, profile: 'test', universeIndex: 0 } as any
    ]

    const clones = [
      { id: 'clone1', position3d: [1, 2, 3], rotation3d: [0, 0, 0] } as any,
      { id: 'clone2', position3d: [-1, 2, 3], rotation3d: [0, 0, 0] } as any
    ]

    await fixtureManager.setFixtureClones(fixtureId, clones)

    const updatedFixture = fixtureManager.getPatch().find(f => f.id === fixtureId)
    expect(updatedFixture).toBeDefined()
    expect(updatedFixture!.clones).toHaveLength(2)
    expect(updatedFixture!.clones![0].id).toBe('clone1')
    
    // Ensure writeFile was called to save the patch
    expect(fs.promises.writeFile).toHaveBeenCalled()
  })
})
