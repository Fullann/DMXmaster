import type { AudioBand, AudioTrigger } from './audioTypes'
import type { EffectsEngine } from './effectsEngine'
import { randomUUID } from 'crypto'

export class AudioEngine {
  private activeTriggers: Map<string, AudioTrigger> = new Map()
  
  // Current raw energy values (0-255) received from renderer
  private currentEnergy: Record<AudioBand, number> = {
    lows: 0,
    mids: 0,
    highs: 0
  }

  // ── Updates from IPC ────────────────────────────────────────────────────────

  updateBands(lows: number, mids: number, highs: number): void {
    this.currentEnergy.lows = lows
    this.currentEnergy.mids = mids
    this.currentEnergy.highs = highs
  }

  // ── Trigger Management ──────────────────────────────────────────────────────

  addTrigger(trigger: Omit<AudioTrigger, 'id'>): string {
    const id = randomUUID()
    this.activeTriggers.set(id, { id, ...trigger })
    console.log(`[AudioEngine] Added trigger ${id} for band ${trigger.band}`)
    return id
  }

  removeTrigger(id: string): void {
    this.activeTriggers.delete(id)
  }

  getTriggers(): AudioTrigger[] {
    return Array.from(this.activeTriggers.values())
  }

  // ── DMX Engine Hooks ────────────────────────────────────────────────────────

  /**
   * Called by DmxEngine.tick() to evaluate fixture-targeted audio triggers.
   * Returns a map of stateKeys to offset values (0-255) to be ADDITIVELY clamped.
   */
  getFixtureOffsets(): Record<string, Record<string, number>> {
    const offsets: Record<string, Record<string, number>> = {}

    for (const trigger of this.activeTriggers.values()) {
      if (trigger.targetType !== 'fixture' || !trigger.fixtureIds || !trigger.channelType) continue

      // Get current energy for this band (0-255)
      const energy = this.currentEnergy[trigger.band]
      if (energy <= 5) continue // Noise gate

      // Map energy (0-255) to the user's min/max bounds
      // (energy / 255) * (max - min) + min
      const scale = energy / 255
      const offsetValue = Math.round(scale * (trigger.maxVal - trigger.minVal) + trigger.minVal)

      // Map ChannelType to logical stateKey (e.g. 'Intensity' -> 'intensity')
      const stateKey = channelTypeToStateKey(trigger.channelType)
      if (!stateKey) continue

      for (const fixId of trigger.fixtureIds) {
        if (!offsets[fixId]) offsets[fixId] = {}
        // If multiple triggers target the same fixture+channel, Highest Takes Precedence for the offset
        const existing = offsets[fixId][stateKey] || 0
        offsets[fixId][stateKey] = Math.max(existing, offsetValue)
      }
    }

    return offsets
  }

  /**
   * Called by DmxEngine.tick() to dynamically modulate EffectsEngine parameters.
   * This temporarily overrides the FX Engine's base parameters.
   */
  applyFxModifications(fxEngine: EffectsEngine): void {
    // Reset any temporary modulations from the previous tick
    fxEngine.resetModulations()

    for (const trigger of this.activeTriggers.values()) {
      if (trigger.targetType !== 'fx' || !trigger.fxId || !trigger.fxParam) continue
      
      const energy = this.currentEnergy[trigger.band]
      if (energy <= 5) continue // Noise gate

      const scale = energy / 255
      const modValue = scale * (trigger.maxVal - trigger.minVal) + trigger.minVal

      // Apply to FX Engine (this tells FX engine to use this value instead of the base config for this tick)
      const paramName = trigger.fxParam === 'speed' ? 'speedHz' : trigger.fxParam
      fxEngine.setModulation(trigger.fxId, paramName, modValue)
    }
  }
}

// ── Internal helper ──────────────────────────────────────────────────────────

function channelTypeToStateKey(type: import('./fixtureTypes').ChannelType): keyof import('./fixtureTypes').FixtureLogicalState | null {
  const map: Partial<Record<import('./fixtureTypes').ChannelType, keyof import('./fixtureTypes').FixtureLogicalState>> = {
    Intensity: 'intensity',
    Red: 'r', Green: 'g', Blue: 'b', White: 'w',
    Smoke: 'smoke', Pan: 'pan', Tilt: 'tilt',
    Shutter: 'shutter', Strobe: 'shutter',
    Speed: 'speed', Effect: 'effect', Color: 'color',
  }
  return map[type] ?? null
}
