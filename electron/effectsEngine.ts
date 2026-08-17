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
      const sizeX         = (mods['sizeX']         ?? fx.config.sizeX ?? size)
      const sizeY         = (mods['sizeY']         ?? fx.config.sizeY ?? size)
      const rotationDeg   = (mods['rotationDegrees'] ?? fx.config.rotationDegrees ?? 0)
      const phaseDegrees  = (mods['phaseDegrees']  ?? fx.config.phaseDegrees)
      const spreadDegrees = (mods['spreadDegrees'] ?? fx.config.spreadDegrees)

      if (size === 0 && sizeX === 0 && sizeY === 0) continue

      // Map ChannelType to the logical state property key
      let stateKey: keyof FixtureLogicalState | null = null
      if (target !== 'Position') {
        stateKey = channelTypeToStateKey(target as import('./fixtureTypes').ChannelType)
      }
      // If we don't have a valid stateKey AND the target isn't Position or we're not doing a Rainbow Color effect, we can't apply it.
      if (!stateKey && target !== 'Position' && shape !== 'Rainbow') continue

      const globalPhaseRad = (phaseDegrees / 360) * Math.PI * 2
      const spreadRad      = (spreadDegrees / 360) * Math.PI * 2

      for (let i = 0; i < fixtureIds.length; i++) {
        const fixId = fixtureIds[i]
        
        // Base phase = time * speed * 2PI + global shift + (index * spread)
        const phase = (fx.runTimeSecs * speedHz * Math.PI * 2) + globalPhaseRad + (i * spreadRad)

        // Generate values
        let wave1D = 0, wavePan = 0, waveTilt = 0, waveR = 0, waveG = 0, waveB = 0
        
        switch (shape) {
          case 'Sine':
            wave1D = Math.sin(phase)
            break
          case 'Triangle':
            wave1D = 2 * Math.abs(2 * ((phase / (2 * Math.PI)) - Math.floor((phase / (2 * Math.PI)) + 0.5))) - 1
            break
          case 'Sawtooth':
            wave1D = 2 * ((phase / (2 * Math.PI)) - Math.floor((phase / (2 * Math.PI)) + 0.5))
            break
          case 'Pulse':
            wave1D = Math.sin(phase) >= 0 ? 1 : -1
            break
          case 'Circle':
            wavePan = Math.sin(phase)
            waveTilt = Math.cos(phase)
            wave1D = Math.sin(phase) // fallback
            break
          case 'Figure8':
            wavePan = Math.sin(phase)
            waveTilt = Math.sin(phase * 2)
            wave1D = Math.sin(phase) // fallback
            break
          case 'Rainbow':
            waveR = Math.sin(phase)
            waveG = Math.sin(phase + (Math.PI * 2 / 3)) // +120deg
            waveB = Math.sin(phase + (Math.PI * 4 / 3)) // +240deg
            wave1D = waveR // fallback
            break
          case 'Random':
            // Smooth pseudo-random noise
            wave1D = (Math.sin(phase * 1.5) + Math.cos(phase * 2.3) + Math.sin(phase * 4.1)) / 3
            wavePan = wave1D
            waveTilt = (Math.cos(phase * 1.7) + Math.sin(phase * 2.1) + Math.cos(phase * 3.9)) / 3
            break
        }

        const amp = (size / 2)

        if (target === 'Position') {
          // Scale components
          const sx = (wavePan || wave1D) * (sizeX / 2)
          const sy = (waveTilt || wave1D) * (sizeY / 2)
          
          // Apply 2D Rotation matrix
          const rotRad = (rotationDeg / 360) * Math.PI * 2
          const rotatedPan = sx * Math.cos(rotRad) - sy * Math.sin(rotRad)
          const rotatedTilt = sx * Math.sin(rotRad) + sy * Math.cos(rotRad)

          offsets[fixId].pan = (offsets[fixId].pan ?? 0) + rotatedPan
          offsets[fixId].tilt = (offsets[fixId].tilt ?? 0) + rotatedTilt
        } else if (shape === 'Rainbow' && (target === 'Color' || stateKey === 'r' || stateKey === 'g' || stateKey === 'b')) {
          offsets[fixId].r = (offsets[fixId].r ?? 0) + waveR * amp
          offsets[fixId].g = (offsets[fixId].g ?? 0) + waveG * amp
          offsets[fixId].b = (offsets[fixId].b ?? 0) + waveB * amp
        } else if (stateKey) {
          // Standard 1D accumulation
          ;(offsets[fixId] as any)[stateKey] = ((offsets[fixId] as any)[stateKey] ?? 0) + wave1D * amp
        }
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
