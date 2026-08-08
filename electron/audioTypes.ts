import type { ChannelType } from './fixtureTypes'

export type AudioBand = 'lows' | 'mids' | 'highs'
export type AudioTargetType = 'fixture' | 'fx'

export interface AudioTrigger {
  id: string
  band: AudioBand
  targetType: AudioTargetType
  
  // If targetType === 'fixture'
  fixtureIds?: string[]
  channelType?: ChannelType | 'Intensity' | 'Color' | 'Pan' | 'Tilt' | 'Smoke' | 'Shutter' | 'Speed' | 'Effect'
  
  // If targetType === 'fx'
  fxId?: string
  fxParam?: 'speed' | 'size'

  // Output config
  minVal: number // defaults to 0
  maxVal: number // defaults to 255
}
