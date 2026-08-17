import { describe, it, expect } from 'vitest'
import { calculateFixtureColor } from '../fixtureColor'
import * as THREE from 'three'

describe('calculateFixtureColor', () => {
  it('should return white (255, 255, 255) when no color channels are defined', () => {
    const channelMap: Record<string, number> = { Intensity: 0 }
    const universe = new Uint8Array(512)
    universe[0] = 255 // Intensity full
    
    const color = calculateFixtureColor(channelMap, universe)
    
    expect(color.r).toBe(1)
    expect(color.g).toBe(1)
    expect(color.b).toBe(1)
  })

  it('should return full red when only the Red channel is defined and set to 255', () => {
    const channelMap: Record<string, number> = { Red: 0 }
    const universe = new Uint8Array(512)
    universe[0] = 255 // Red full
    
    const color = calculateFixtureColor(channelMap, universe)
    
    expect(color.r).toBe(1)
    expect(color.g).toBe(0) // Green should default to 0 because Red is present
    expect(color.b).toBe(0) // Blue should default to 0 because Red is present
  })

  it('should return black (0, 0, 0) when only the Red channel is defined and set to 0', () => {
    // This tests the "cyan bug" where red=0, green=undef, blue=undef resulted in cyan
    const channelMap: Record<string, number> = { Red: 0 }
    const universe = new Uint8Array(512)
    universe[0] = 0 // Red off
    
    const color = calculateFixtureColor(channelMap, universe)
    
    expect(color.r).toBe(0)
    expect(color.g).toBe(0) // Should not be 1!
    expect(color.b).toBe(0) // Should not be 1!
  })

  it('should return the correct color for a full RGB fixture', () => {
    const channelMap: Record<string, number> = { Red: 0, Green: 1, Blue: 2 }
    const universe = new Uint8Array(512)
    universe[0] = 127 // Red
    universe[1] = 255 // Green
    universe[2] = 0   // Blue
    
    const color = calculateFixtureColor(channelMap, universe)
    
    expect(color.r).toBeCloseTo(127 / 255, 2)
    expect(color.g).toBe(1)
    expect(color.b).toBe(0)
  })
})
