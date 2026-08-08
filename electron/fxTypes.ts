import type { ChannelType } from './fixtureTypes'

// ─────────────────────────────────────────────────────────────────────────────
// FX Types
// ─────────────────────────────────────────────────────────────────────────────

export type Waveform = 'Sine' | 'Triangle' | 'Sawtooth' | 'Pulse'

/** Target attributes for an effect. (Usually Pan, Tilt, Intensity, or Colors) */
export type FxTarget = ChannelType

export interface FxConfig {
  /** The type of oscillator */
  shape:         Waveform
  /** Target logical attribute */
  target:        FxTarget
  /** Speed of the LFO in Hertz (e.g. 0.5Hz = 1 cycle per 2 seconds) */
  speedHz:       number
  /** Peak-to-peak amplitude (0 to 255) */
  size:          number
  /** Global phase shift of the entire effect (0 to 360 degrees) */
  phaseDegrees:  number
  /** Phase offset added sequentially per fixture in the group (0 to 360 degrees) */
  spreadDegrees: number
  /** Array of fixture IDs this effect applies to */
  fixtureIds:    string[]
}

export interface ActiveEffect {
  /** UUID of the running effect instance */
  id:          string
  /** The configuration driving this effect */
  config:      FxConfig
  /** Internal accumulator: running time in seconds to calculate phase */
  runTimeSecs: number
}
