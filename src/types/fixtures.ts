// ─────────────────────────────────────────────────────────────────────────────
// Fixture types mirrored for the renderer process.
// Kept in sync with electron/fixtureTypes.ts manually.
// ─────────────────────────────────────────────────────────────────────────────

export type ChannelType =
  | 'Intensity'
  | 'Red' | 'Green' | 'Blue' | 'White'
  | 'Color'
  | 'Pan' | 'Tilt'
  | 'Smoke'
  | 'Shutter' | 'Strobe'
  | 'Speed'
  | 'Effect'
  | 'Gobo' | 'Prism' | 'Zoom' | 'Focus'
  | 'Unknown'

export interface FixtureChannel {
  number:       number
  name:         string
  type:         ChannelType
  defaultValue: number
}

export interface FixtureProfile {
  manufacturer: string
  model:        string
  mode:         string
  channels:     FixtureChannel[]
}

export interface PatchedFixture {
  id:           string
  profileKey:   string
  profile:      FixtureProfile
  startAddress: number
  label:        string
  /** 0-based universe index (0–7). Defaults to 0. */
  universeIndex?: number
  /** 3D world position [x, y, z] for the stage visualizer. */
  position3d?:  [number, number, number]
  /** 3D world rotation [x, y, z] for the stage visualizer (Euler angles). */
  rotation3d?:  [number, number, number]
}

export interface FixtureLogicalState {
  intensity: number
  r: number; g: number; b: number; w: number
  smoke:     number
  pan:       number; tilt: number
  shutter:   number; speed: number; effect: number; color: number
  gobo:      number; prism: number; zoom: number; focus: number
}

export const DEFAULT_LOGICAL_STATE: FixtureLogicalState = {
  intensity: 0,
  r: 0, g: 0, b: 0, w: 0,
  smoke: 0,
  pan: 128, tilt: 128,
  shutter: 255,
  speed: 0, effect: 0, color: 0,
  gobo: 0, prism: 0, zoom: 128, focus: 128,
}

export interface ProfileEntry {
  key:     string
  profile: FixtureProfile
}

// ── Capability detection ─────────────────────────────────────────────────────

export interface FixtureCapabilities {
  hasIntensity: boolean
  hasRgb:       boolean
  hasWhite:     boolean
  hasSmoke:     boolean
  hasPanTilt:   boolean
  hasColor:     boolean
  hasEffect:    boolean
  hasStrobe:    boolean
  hasGobo:      boolean
  hasPrism:     boolean
  hasZoomFocus: boolean
}

export function getFixtureCapabilities(fixture: PatchedFixture): FixtureCapabilities {
  const types = new Set(fixture.profile.channels.map(c => c.type))
  return {
    hasIntensity: types.has('Intensity'),
    hasRgb:       types.has('Red') && types.has('Green') && types.has('Blue'),
    hasWhite:     types.has('White'),
    hasSmoke:     types.has('Smoke'),
    hasPanTilt:   types.has('Pan') && types.has('Tilt'),
    hasColor:     types.has('Color'),
    hasEffect:    types.has('Effect'),
    hasStrobe:    types.has('Strobe') || types.has('Shutter'),
    hasGobo:      types.has('Gobo'),
    hasPrism:     types.has('Prism'),
    hasZoomFocus: types.has('Zoom') || types.has('Focus'),
  }
}

// ── JSON Profile Validator ───────────────────────────────────────────────────

export const VALID_CHANNEL_TYPES = new Set<string>([
  'Intensity', 'Red', 'Green', 'Blue', 'White',
  'Color', 'Pan', 'Tilt', 'Smoke', 'Shutter', 'Strobe',
  'Speed', 'Effect', 'Gobo', 'Prism', 'Zoom', 'Focus', 'Unknown',
])

export interface ValidationResult {
  valid:   boolean
  profile: FixtureProfile | null
  errors:  string[]
}

export function validateFixtureProfile(raw: unknown): ValidationResult {
  const errors: string[] = []

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { valid: false, profile: null, errors: ['Root value must be a JSON object.'] }
  }

  const p = raw as Record<string, unknown>

  if (typeof p.manufacturer !== 'string' || !p.manufacturer.trim())
    errors.push('"manufacturer" must be a non-empty string.')
  if (typeof p.model !== 'string' || !p.model.trim())
    errors.push('"model" must be a non-empty string.')
  if (typeof p.mode !== 'string' || !p.mode.trim())
    errors.push('"mode" must be a non-empty string.')

  if (!Array.isArray(p.channels)) {
    errors.push('"channels" must be an array.')
  } else if (p.channels.length === 0) {
    errors.push('"channels" must not be empty.')
  } else {
    ;(p.channels as unknown[]).forEach((ch, i) => {
      const c = ch as Record<string, unknown>
      const prefix = `channels[${i}]`
      if (typeof c.number !== 'number' || c.number < 1 || !Number.isInteger(c.number))
        errors.push(`${prefix}.number must be a positive integer.`)
      if (typeof c.name !== 'string' || !c.name.trim())
        errors.push(`${prefix}.name must be a non-empty string.`)
      if (typeof c.type !== 'string' || !VALID_CHANNEL_TYPES.has(c.type))
        errors.push(`${prefix}.type "${c.type}" is invalid. Valid: ${[...VALID_CHANNEL_TYPES].join(', ')}`)
      if (typeof c.defaultValue !== 'number' || c.defaultValue < 0 || c.defaultValue > 255 || !Number.isInteger(c.defaultValue))
        errors.push(`${prefix}.defaultValue must be an integer 0–255.`)
    })
  }

  if (errors.length > 0) return { valid: false, profile: null, errors }
  return { valid: true, profile: raw as FixtureProfile, errors: [] }
}

// ── Utility: hex ↔ RGB ───────────────────────────────────────────────────────

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
}
