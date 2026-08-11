// ─────────────────────────────────────────────────────────────────────────────
// Chaser Types
//
// A Chaser is an ordered list of steps. Each step references a saved Scene
// and defines its own hold and crossfade times. When BPM sync is enabled,
// the holdMs is overridden by the global BPM clock (beatsPerStep controls
// how many beats each step holds before advancing).
// ─────────────────────────────────────────────────────────────────────────────

/** A single step in a chaser sequence */
export interface ChaserStep {
  /** UUID of the Scene to recall for this step */
  sceneId:      string
  /** Array of Palette IDs that this step references. */
  paletteRefs?: string[]
  /** Human-readable label (usually mirrors scene name, for display only) */
  label:        string
  /** How long to hold this step in milliseconds (used when bpmSync = false) */
  holdMs:       number
  /** Linear crossfade duration in milliseconds (0 = snap) */
  crossfadeMs:  number
}

/** A complete chaser definition */
export interface Chaser {
  /** UUID — also used as the JSON filename */
  id:            string
  /** Human-readable name */
  name:          string
  /** Ordered list of steps */
  steps:         ChaserStep[]
  /**
   * When true, holdMs is ignored and the BPM clock drives step advancement.
   * Each step holds for `beatsPerStep` beats at the current BPM.
   */
  bpmSync:       boolean
  /**
   * Number of beats each step is held when bpmSync = true.
   * e.g. 1 = advance every beat, 2 = every 2 beats (half-time), 0.5 = 2× speed.
   */
  beatsPerStep:  number
  /** ISO timestamp for display / sorting */
  createdAt:     string
}

/** Minimal chaser info for list views */
export interface ChaserInfo {
  id:        string
  name:      string
  stepCount: number
  bpmSync:   boolean
  createdAt: string
}

/** Real-time chaser playback status pushed to the renderer */
export interface ChaserStatus {
  isRunning:     boolean
  chaserId:      string | null
  chaserName:    string | null
  currentStep:   number       // 0-indexed
  totalSteps:    number
  /** Global BPM (always present, even when stopped) */
  bpm:           number
  /** 0.0 → 1.0 progress through the current step's hold time */
  stepProgress:  number
}
