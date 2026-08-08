export type PayloadType = 'scene' | 'fx' | 'command'

export interface GridCellPayload {
  type: PayloadType
  /** ID of the scene or effect. Empty if type is command. */
  targetId: string
}

export interface GridCell {
  /** The assigned MIDI note (0-63 sequentially for 8x8) */
  note: number
  /** What this button does when pressed */
  payload: GridCellPayload | null
  /** The Launchpad velocity representing the color (e.g. 13=Red, 21=Green) */
  colorVelocity: number
}

// Global state of the entire grid (one page = 64 cells)
export type LiveGridState = GridCell[]

// ── Multi-Page (Bank) types ────────────────────────────────────────────────────

/** Number of cells in one 8×8 page */
export const DEFAULT_GRID_SIZE = 64

/** How many independent pages the Live Grid supports */
export const GRID_PAGE_COUNT = 8

/** All pages keyed 0–7 */
export type GridPages = Record<number, LiveGridState>

/** Creates a single empty 64-cell page */
export function createEmptyPage(): LiveGridState {
  return Array.from({ length: DEFAULT_GRID_SIZE }, (_, i) => ({
    note: i,
    payload: null,
    colorVelocity: 0,
  }))
}

/** Creates the full 8-page default structure */
export function createEmptyPages(): GridPages {
  const pages: GridPages = {}
  for (let p = 0; p < GRID_PAGE_COUNT; p++) {
    pages[p] = createEmptyPage()
  }
  return pages
}
