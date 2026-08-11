// ─────────────────────────────────────────────────────────────────────────────
// Scene types mirrored for the renderer process.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Which parameter groups were captured when recording this scene.
 * Mirrors electron/sceneTypes.ts ParameterGroup.
 */
export type ParameterGroup = 'all' | 'color' | 'position' | 'intensity' | 'beam'

export const PARAMETER_GROUP_LABELS: Record<ParameterGroup, string> = {
  all:       'All',
  color:     'Color',
  position:  'Position',
  intensity: 'Intensity',
  beam:      'Beam',
}

export interface Scene {
  id:            string
  name:          string
  fadeTimeMs:    number
  fixtureStates: Record<string, Record<string, number>>
  paletteRefs?:  string[]
  createdAt:     string
  filterMask:    ParameterGroup
}


export interface FadeStatus {
  isActive:   boolean
  sceneId:    string | null
  sceneName:  string | null
  fadeTimeMs: number
  elapsedMs:  number
  progress:   number
}

// Palette of accent colours for busking grid cards (cycles by index)
export const SCENE_COLORS = [
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // red
  '#7c3aed', // violet (repeat)
  '#0284c7', // blue
  '#9333ea', // purple
] as const

export function getSceneColor(index: number): string {
  return SCENE_COLORS[index % SCENE_COLORS.length]
}

export function formatFadeTime(ms: number): string {
  if (ms <= 0) return 'Snap'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
