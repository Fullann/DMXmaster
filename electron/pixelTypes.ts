export type MatrixRouting = 'Linear' | 'ZigZag'

export interface MatrixFixture {
  id: string
  name: string
  width: number
  height: number
  startUniverse: number
  startChannel: number
  routing: MatrixRouting
}

export interface PixelConfig {
  matrices: MatrixFixture[]
}
