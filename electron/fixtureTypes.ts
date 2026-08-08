// ─────────────────────────────────────────────────────────────────────────────
// Fixture Type Definitions — Canonical Schema
//
// This interface is the single source of truth for the Fixture Profile JSON
// format. Any LLM asked to generate a profile from a manual should produce
// an object matching FixtureProfile exactly.
//
// AI Prompt template example:
//   "Generate a DMX fixture profile JSON for the <MANUFACTURER> <MODEL>.
//    Use the following TypeScript interface as the schema: [paste FixtureProfile]
//    Channel types must be one of: Intensity | Red | Green | Blue | White |
//    Color | Pan | Tilt | Smoke | Shutter | Strobe | Speed | Effect | Unknown"
// ─────────────────────────────────────────────────────────────────────────────

export type ChannelType =
  | 'Intensity'
  | 'Red' | 'Green' | 'Blue' | 'White'
  | 'Color'      // Color wheel / mixed color
  | 'Pan' | 'Tilt'
  | 'Smoke'
  | 'Shutter' | 'Strobe'
  | 'Speed'
  | 'Effect'
  | 'Unknown'

export interface FixtureChannel {
  /** 1-indexed channel offset relative to the fixture's start address */
  number:       number
  name:         string
  type:         ChannelType
  /** DMX value sent when no logical command has been issued (0-255) */
  defaultValue: number
}

/** The AI-ready fixture profile schema */
export interface FixtureProfile {
  manufacturer: string
  model:        string
  /** Mode name, e.g. "3-channel", "Basic", "Extended" */
  mode:         string
  channels:     FixtureChannel[]
}

export interface Fixture {
  id: string
  name: string
  profileId: string
  startChannel: number
}

export interface FixtureGroup {
  id: string
  name: string
  fixtureIds: string[]
}

/** A profile assigned to a specific DMX start address */
export interface PatchedFixture {
  /** UUID assigned at patch time */
  id:           string
  /** Filename key (without .json extension) */
  profileKey:   string
  profile:      FixtureProfile
  /** 1-indexed DMX universe address (1–512) */
  startAddress: number
  /** Human-readable label shown in the UI */
  label:        string
  /** 0-based universe index (0–7). Defaults to 0. */
  universeIndex?: number
  /** 3D world position [x, y, z] for the stage visualizer. Defaults to auto-layout. */
  position3d?:  [number, number, number]
}

/** Logical state per patched fixture — these map to raw channel values in the universe */
export interface FixtureLogicalState {
  intensity: number  // Intensity channel (0-255)
  r:         number  // Red   (0-255)
  g:         number  // Green (0-255)
  b:         number  // Blue  (0-255)
  w:         number  // White (0-255)
  smoke:     number  // Smoke output (0 or 255)
  pan:       number  // Pan   (0-255)
  tilt:      number  // Tilt  (0-255)
  shutter:   number  // Shutter/Strobe (0-255)
  speed:     number  // Speed (0-255)
  effect:    number  // Effect (0-255)
  color:     number  // Color wheel (0-255)
}

export const DEFAULT_LOGICAL_STATE: Readonly<FixtureLogicalState> = {
  intensity: 0,
  r: 0, g: 0, b: 0, w: 0,
  smoke: 0,
  pan: 128, tilt: 128,
  shutter: 255,
  speed: 0,
  effect: 0,
  color: 0,
}

export interface ProfileEntry {
  key:     string
  profile: FixtureProfile
}

/** All valid channel type strings — used for validation */
export const VALID_CHANNEL_TYPES = new Set<ChannelType>([
  'Intensity', 'Red', 'Green', 'Blue', 'White',
  'Color', 'Pan', 'Tilt', 'Smoke', 'Shutter', 'Strobe',
  'Speed', 'Effect', 'Unknown',
])

// ── Default profiles bundled with the app ────────────────────────────────────

export const DEFAULT_PROFILES: ProfileEntry[] = [
  {
    key: 'generic_rgb_led_par_3ch',
    profile: {
      manufacturer: 'Generic', model: 'RGB LED Par', mode: '3-channel',
      channels: [
        { number: 1, name: 'Red',   type: 'Red',   defaultValue: 0 },
        { number: 2, name: 'Green', type: 'Green', defaultValue: 0 },
        { number: 3, name: 'Blue',  type: 'Blue',  defaultValue: 0 },
      ],
    },
  },
  {
    key: 'generic_rgbw_led_par_4ch',
    profile: {
      manufacturer: 'Generic', model: 'RGBW LED Par', mode: '4-channel',
      channels: [
        { number: 1, name: 'Red',   type: 'Red',   defaultValue: 0 },
        { number: 2, name: 'Green', type: 'Green', defaultValue: 0 },
        { number: 3, name: 'Blue',  type: 'Blue',  defaultValue: 0 },
        { number: 4, name: 'White', type: 'White', defaultValue: 0 },
      ],
    },
  },
  {
    key: 'generic_led_par_5ch',
    profile: {
      manufacturer: 'Generic', model: 'LED Par 5ch', mode: '5-channel',
      channels: [
        { number: 1, name: 'Dimmer', type: 'Intensity', defaultValue: 0 },
        { number: 2, name: 'Red',    type: 'Red',       defaultValue: 0 },
        { number: 3, name: 'Green',  type: 'Green',     defaultValue: 0 },
        { number: 4, name: 'Blue',   type: 'Blue',      defaultValue: 0 },
        { number: 5, name: 'Effect', type: 'Effect',    defaultValue: 0 },
      ],
    },
  },
  {
    key: 'generic_smoke_machine_1ch',
    profile: {
      manufacturer: 'Generic', model: 'Smoke Machine', mode: '1-channel',
      channels: [
        { number: 1, name: 'Smoke Output', type: 'Smoke', defaultValue: 0 },
      ],
    },
  },
  {
    key: 'generic_moving_head_basic_4ch',
    profile: {
      manufacturer: 'Generic', model: 'Moving Head Basic', mode: '4-channel',
      channels: [
        { number: 1, name: 'Pan',    type: 'Pan',       defaultValue: 128 },
        { number: 2, name: 'Tilt',   type: 'Tilt',      defaultValue: 128 },
        { number: 3, name: 'Dimmer', type: 'Intensity', defaultValue: 0   },
        { number: 4, name: 'Speed',  type: 'Speed',     defaultValue: 0   },
      ],
    },
  },
]
