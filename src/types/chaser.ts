// ─────────────────────────────────────────────────────────────────────────────
// Chaser types mirrored for the renderer process.
// These mirror electron/chaserTypes.ts exactly.
// ─────────────────────────────────────────────────────────────────────────────

export interface ChaserStep {
  sceneId:     string
  label:       string
  holdMs:      number
  crossfadeMs: number
  paletteRefs?: string[]
}

export interface Chaser {
  id:           string
  name:         string
  steps:        ChaserStep[]
  bpmSync:      boolean
  beatsPerStep: number
  createdAt:    string
}

export interface ChaserStatus {
  isRunning:    boolean
  chaserId:     string | null
  chaserName:   string | null
  currentStep:  number
  totalSteps:   number
  bpm:          number
  stepProgress: number
}
