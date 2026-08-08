import type { FxTarget, Waveform } from '../../../electron/fxTypes'

export type { FxConfig, ActiveEffect, Waveform, FxTarget } from '../../../electron/fxTypes'

// Frontend-specific FX presets format (for future saving/loading)
export interface FxPreset {
  id: string
  name: string
  shape: Waveform
  target: FxTarget
  speedHz: number
  size: number
  phaseDegrees: number
  spreadDegrees: number
}
