import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DmxEngine } from '../dmxEngine'
import { FixtureManager } from '../fixtureManager'
import { SerialManager } from '../serialManager'
import type { FixtureProfile } from '../fixtureTypes'

// Mock Electron app
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/path') },
  ipcMain: { on: vi.fn(), handle: vi.fn() }
}))

// Mock SerialManager
vi.mock('../serialManager', () => {
  return {
    SerialManager: class {
      write = vi.fn()
    },
  }
})

describe('Engine & FixtureManager Integration', () => {
  let engine: DmxEngine
  let fixtureManager: FixtureManager
  let mockSerial: SerialManager

  beforeEach(() => {
    mockSerial = new SerialManager()
    engine = new DmxEngine(mockSerial)
    fixtureManager = new FixtureManager()
    
    // We don't initialize the fixture manager to avoid disk I/O. 
    // We just inject profiles and patch manually for testing logic.
    engine.setFixtureManager(fixtureManager)
  })

  it('should override logical channels but ignore custom channels', () => {
    const testProfile: FixtureProfile = {
      manufacturer: 'Test',
      model: 'Custom Fix',
      mode: '4CH',
      channels: [
        { number: 1, type: 'Intensity', defaultValue: 0 },
        { number: 2, type: 'Pan', defaultValue: 128 },
        { number: 3, type: 'Custom', defaultValue: 0 },
        { number: 4, type: 'Unknown', defaultValue: 255 },
      ]
    }

    // Inject profile and patch manually
    fixtureManager['profiles'].set('test-profile', testProfile)
    fixtureManager.patchFixture('test-profile', 1, 'Test Fixture', 0)

    // 1. DMX Engine sets some raw manual values (like from Dashboard)
    engine.setChannel(1, 255) // Intensity
    engine.setChannel(2, 200) // Pan
    engine.setChannel(3, 100) // Custom
    engine.setChannel(4, 50)  // Unknown

    // 2. Trigger engine tick which calls applyToUniverses internally
    ;(engine as any)._tick()

    const universes = engine.getAllUniverseSnapshots()

    // 3. Verify overrides
    // Intensity (ch 1) is logical, should be overridden by default state (0)
    expect(universes[0][0]).toBe(0)
    
    // Pan (ch 2) is logical, should be overridden by default state (128)
    expect(universes[0][1]).toBe(128)

    // Custom (ch 3) is ignored by engine, manual value (100) should persist
    expect(universes[0][2]).toBe(100)

    // Unknown (ch 4) is ignored by engine, manual value (50) should persist
    expect(universes[0][3]).toBe(50)
  })

  it('should not override any channels if engine is bypassed', () => {
    const testProfile: FixtureProfile = {
      manufacturer: 'Test',
      model: 'Simple',
      mode: '1CH',
      channels: [{ number: 1, type: 'Intensity', defaultValue: 0 }]
    }

    fixtureManager['profiles'].set('test-simple', testProfile)
    fixtureManager.patchFixture('test-simple', 10)

    // Enable Bypass Mode
    engine.engineBypassed = true

    // Manual control via Dashboard
    engine.setChannel(10, 255)

    // Manually trigger tick to simulate loop
    // (We cast to any to access private _tick method)
    ;(engine as any)._tick()

    const universes = engine.getAllUniverseSnapshots()

    // Intensity should remain 255 because applyToUniverses was skipped
    expect(universes[0][9]).toBe(255)
  })
})
