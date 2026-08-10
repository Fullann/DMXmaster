import { randomUUID } from 'crypto'
import type { FxConfig, ActiveEffect } from './fxTypes'
import type { FixtureLogicalState } from './fixtureTypes'

// ─────────────────────────────────────────────────────────────────────────────
// EffectsEngine
//
// Generates instantaneous LFO values for logical fixture attributes.
// Runs inside the DmxEngine at ~44Hz.
//
// Math:
//   Phase is calculated using elapsed time, speed, global phase, and per-fixture spread.
//   Output range is generally bipolar [-size/2, +size/2].
//   For Intensity/Color, it can be mathematically advantageous to be bipolar so
//   it oscillates around the base value set by the programmer/scene.
// ─────────────────────────────────────────────────────────────────────────────

export class EffectsEngine {
  private activeEffects = new Map<string, ActiveEffect>()

  // ── Per-tick Audio Modulations ─────────────────────────────────────────────
  // Keyed by effectId → { paramName → overrideValue }.
  // Populated by AudioEngine.applyFxModifications() each tick, then cleared.
  private modulations = new Map<string, Record<string, number>>()

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  addEffect(config: FxConfig): string {
    const id = randomUUID()
    this.activeEffects.set(id, {
      id,
      config,
      runTimeSecs: 0,
      isPaused: false,
    })
    console.log(`[FX Engine] Added effect ${config.shape} on ${config.target} (${config.fixtureIds.length} fixtures)`)
    return id
  }

  updateEffect(id: string, config: FxConfig): void {
    const fx = this.activeEffects.get(id)
    if (fx) {
      fx.config = config
    }
  }

  setEffectPaused(id: string, paused: boolean): void {
    const fx = this.activeEffects.get(id)
    if (fx) {
      fx.isPaused = paused
    }
  }

  removeEffect(id: string): void {
    this.activeEffects.delete(id)
  }

  clearAll(): void {
    this.activeEffects.clear()
  }

  getEffects(): ActiveEffect[] {
    return Array.from(this.activeEffects.values())
  }

  // ── Audio Modulation API ──────────────────────────────────────────────────

  /**
   * Clear all per-tick audio modulations.
   * Called at the BEGINNING of AudioEngine.applyFxModifications().
   */
  resetModulations(): void {
    this.modulations.clear()
  }

  /**
   * Set a per-tick override for a single parameter of a running effect.
   * @param fxId     The effect UUID returned by addEffect()
   * @param param    The config property to override (e.g. 'speedHz', 'size')
   * @param value    The value to use for this tick only
   */
  setModulation(fxId: string, param: string, value: number): void {
    if (!this.activeEffects.has(fxId)) return
    if (!this.modulations.has(fxId)) this.modulations.set(fxId, {})
    this.modulations.get(fxId)![param] = value
  }

  // ── Engine Tick ────────────────────────────────────────────────────────────

  /**
   * Advances the internal timers of all running effects.
   * Called by DmxEngine._tick() at 44Hz.
   */
  tick(deltaMs: number): void {
    const deltaSecs = deltaMs / 1000
    for (const fx of this.activeEffects.values()) {
      if (!fx.isPaused) {
        fx.runTimeSecs += deltaSecs
      }
    }
  }

  /**
   * Evaluates all oscillators and returns the instantaneous offsets for every targeted fixture.
   * Format: { "fixture123": { "intensity": 45, "pan": -12 }, ... }
   */
  getOffsets(): Record<string, Partial<FixtureLogicalState>> {
    const offsets: Record<string, Partial<FixtureLogicalState>> = {}

    // Initialise empty records for fixtures we might touch
    for (const fx of this.activeEffects.values()) {
      for (const fixId of fx.config.fixtureIds) {
        if (!offsets[fixId]) offsets[fixId] = {}
      }
    }

    // Evaluate each effect
    for (const fx of this.activeEffects.values()) {
      if (fx.isPaused) continue

      const { shape, target, fixtureIds } = fx.config

      // Apply audio modulations for this tick (temporary overrides)
      const mods = this.modulations.get(fx.id) ?? {}
      const speedHz       = (mods['speedHz']       ?? fx.config.speedHz)
      const size          = (mods['size']           ?? fx.config.size)
      const phaseDegrees  = (mods['phaseDegrees']  ?? fx.config.phaseDegrees)
      const spreadDegrees = (mods['spreadDegrees'] ?? fx.config.spreadDegrees)

      if (size === 0) continue

      // Map ChannelType to the logical state property key
      const stateKey = channelTypeToStateKey(target)
      if (!stateKey) continue

      const globalPhaseRad = (phaseDegrees / 360) * Math.PI * 2
      const spreadRad      = (spreadDegrees / 360) * Math.PI * 2

      for (let i = 0; i < fixtureIds.length; i++) {
        const fixId = fixtureIds[i]
        
        // Base phase = time * speed * 2PI + global shift + (index * spread)
        const phase = (fx.runTimeSecs * speedHz * Math.PI * 2) + globalPhaseRad + (i * spreadRad)

        // Generate bipolar value [-1.0, 1.0]
        let wave = 0
        switch (shape) {
          case 'Sine':
            wave = Math.sin(phase)
            break
          case 'Triangle':
            // triangle wave between -1 and 1
            wave = 2 * Math.abs(2 * ((phase / (2 * Math.PI)) - Math.floor((phase / (2 * Math.PI)) + 0.5))) - 1
            break
          case 'Sawtooth':
            // sawtooth wave between -1 and 1
            wave = 2 * ((phase / (2 * Math.PI)) - Math.floor((phase / (2 * Math.PI)) + 0.5))
            break
          case 'Pulse':
            // square wave between -1 and 1
            wave = Math.sin(phase) >= 0 ? 1 : -1
            break
        }

        // Scale to [-size/2, size/2]
        const amplitude = (size / 2) * wave

        // Accumulate (so multiple effects on the same attribute stack)
        const currentVal = (offsets[fixId] as any)[stateKey] ?? 0
        ;(offsets[fixId] as any)[stateKey] = currentVal + amplitude
      }
    }

    return offsets
  }
}

// ── Internal helper ──────────────────────────────────────────────────────────

function channelTypeToStateKey(type: import('./fixtureTypes').ChannelType): keyof FixtureLogicalState | null {
  const map: Partial<Record<import('./fixtureTypes').ChannelType, keyof FixtureLogicalState>> = {
    Intensity: 'intensity',
    Red: 'r', Green: 'g', Blue: 'b', White: 'w',
    Smoke: 'smoke', Pan: 'pan', Tilt: 'tilt',
    Shutter: 'shutter', Strobe: 'shutter',
    Speed: 'speed', Effect: 'effect', Color: 'color',
  }
  return map[type] ?? null
}
