export type PaletteType = 'position' | 'color' | 'beam' | 'gobo' | 'all'

export interface Palette {
  id: string
  name: string
  type: PaletteType
  // fixtureId -> partial logical state
  values: Record<string, Partial<import('./fixtureTypes').FixtureLogicalState>>
}
