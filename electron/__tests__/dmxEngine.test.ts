import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DmxEngine } from '../dmxEngine'
import { SerialManager } from '../serialManager'

// Mock the SerialManager to avoid real serial port calls
vi.mock('../serialManager', () => {
  return {
    SerialManager: class {
      write = vi.fn()
    },
  }
})

describe('DmxEngine', () => {
  let engine: DmxEngine
  let mockSerial: SerialManager

  beforeEach(() => {
    mockSerial = new SerialManager()
    engine = new DmxEngine(mockSerial)
  })

  it('should initialize 8 universes with all 0s', () => {
    const universes = engine.getAllUniverseSnapshots()
    expect(universes.length).toBe(8)
    expect(universes[0].length).toBe(512)
    expect(universes[0][0]).toBe(0)
  })

  it('should update a specific channel in universe 0', () => {
    engine.setChannel(1, 255) // channel 1 to full
    const universe = engine.getUniverseSnapshot(0)
    expect(universe[0]).toBe(255) // index 0 is channel 1
    expect(universe[1]).toBe(0)
  })

  it('should update a specific channel in another universe', () => {
    engine.setChannel(512, 128, 1) // channel 512, universe 1
    const universe1 = engine.getUniverseSnapshot(1)
    expect(universe1[511]).toBe(128)
  })

  it('should not throw if channel is out of range', () => {
    expect(() => {
      engine.setChannel(513, 255)
      engine.setChannel(0, 255)
    }).not.toThrow()
  })

  it('should blackout all universes', () => {
    engine.setChannel(1, 255, 0)
    engine.setChannel(10, 128, 2)
    
    engine.blackout()
    
    const u0 = engine.getUniverseSnapshot(0)
    const u2 = engine.getUniverseSnapshot(2)
    expect(u0[0]).toBe(0)
    expect(u2[9]).toBe(0)
  })
})
