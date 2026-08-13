export interface Cue {
  id: string
  number: number
  name: string
  sceneId: string | null
  fadeTime: number
  delayTime: number
  trigger: 'manual' | 'follow'
  followTime: number
}

export interface Cuelist {
  id: string
  name: string
  cues: Cue[]
}

export interface CuelistPlaybackState {
  activeCuelistId: string | null
  currentCueId: string | null
  nextCueId: string | null
  state: 'stopped' | 'fading' | 'waiting'
}
