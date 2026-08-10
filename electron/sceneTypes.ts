import type { FixtureLogicalState } from './fixtureTypes'

// ─────────────────────────────────────────────────────────────────────────────
// Scene Types
//
// A Scene is a snapshot of some or all fixture logical states.
// The "tracking" model: fixtureStates only contains parameters that were
// intentionally set — recalling a "Color" scene will NOT overwrite Pan/Tilt
// values because those keys won't be present in the snapshot.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A partial snapshot of a fixture's logical state.
 * Only the parameters explicitly captured are stored.
 */
export type FixtureSnapshot = Partial<FixtureLogicalState>

/**
 * Which parameter groups were captured when recording this scene.
 *  - 'all'       → every logical parameter
 *  - 'color'     → r, g, b, w, color
 *  - 'position'  → pan, tilt
 *  - 'intensity' → intensity only
 *  - 'beam'      → shutter, speed, effect
 */
export type ParameterGroup = 'all' | 'color' | 'position' | 'intensity' | 'beam'

/** Keys of FixtureLogicalState that belong to each ParameterGroup */
export const PARAMETER_GROUP_KEYS: Record<ParameterGroup, (keyof FixtureLogicalState)[]> = {
  all:       ['intensity', 'r', 'g', 'b', 'w', 'color', 'pan', 'tilt', 'smoke', 'shutter', 'speed', 'effect'],
  color:     ['r', 'g', 'b', 'w', 'color'],
  position:  ['pan', 'tilt'],
  intensity: ['intensity'],
  beam:      ['shutter', 'speed', 'effect'],
}

export interface Scene {
  /** UUID — also used as the JSON filename */
  id:            string
  /** Human-readable name shown in the Busking Grid */
  name:          string
  /** Linear crossfade duration in milliseconds (0 = snap) */
  fadeTimeMs:    number
  /** fixtureId → snapshot of only the parameters this scene controls */
  fixtureStates: Record<string, FixtureSnapshot>
  /** ISO timestamp for display / sorting */
  createdAt:     string
  /** Which parameter group was captured — defaults to 'all' for legacy scenes */
  filterMask:    ParameterGroup
  /** State of running effects when this scene was captured (optional for backwards compat) */
  fxState?: {
    activeEffects: import('./fxTypes').ActiveEffect[]
  }
}

/** Minimal scene info returned in list operations */
export interface SceneInfo {
  id:         string
  name:       string
  fadeTimeMs: number
  createdAt:  string
  /** How many fixtures + parameters this scene controls */
  fixtureCount: number
}

/** Current crossfade status pushed to the renderer */
export interface FadeStatus {
  isActive:    boolean
  sceneId:     string | null
  sceneName:   string | null
  fadeTimeMs:  number
  elapsedMs:   number
  /** 0.0 → 1.0 */
  progress:    number
}
