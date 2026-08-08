export interface ShowEvent {
  id: string
  timestampMs: number
  action: 'recallScene' | 'triggerFx'
  payloadId: string // The ID of the scene or FX config to trigger
}

export interface ShowTrack {
  id: string
  name: string
  events: ShowEvent[]
}

export interface Show {
  id: string
  name: string
  audioFileName: string | null
  durationMs: number
  tracks: ShowTrack[]
}
