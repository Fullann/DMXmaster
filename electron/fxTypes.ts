import type { ChannelType } from './fixtureTypes'

// ─────────────────────────────────────────────────────────────────────────────
// FX Types
// ─────────────────────────────────────────────────────────────────────────────

export type Waveform = 'Sine' | 'Triangle' | 'Sawtooth' | 'Pulse' | 'Circle' | 'Figure8' | 'Rainbow' | 'Random'

/** Target attributes for an effect. (Usually Pan, Tilt, Intensity, or Colors, plus 'Position' for 2D FX) */
export type FxTarget = ChannelType | 'Position'

export interface FxConfig {
  /** The type of oscillator */
  shape:         Waveform
  /** Target logical attribute */
  target:        FxTarget
  /** Speed of the LFO in Hertz (e.g. 0.5Hz = 1 cycle per 2 seconds) */
  speedHz:       number
  /** Peak-to-peak amplitude (0 to 255) for 1D targets */
  size:          number
  /** Peak-to-peak amplitude on X axis (0 to 255) for 2D Position targets */
  sizeX?:        number
  /** Peak-to-peak amplitude on Y axis (0 to 255) for 2D Position targets */
  sizeY?:        number
  /** Rotation of the 2D shape in degrees (0 to 360) */
  rotationDegrees?: number
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
  /** The time the effect has been running (used to calculate phase) */
  runTimeSecs: number
  /** Whether the effect is currently paused/deactivated */
  isPaused?: boolean
}
