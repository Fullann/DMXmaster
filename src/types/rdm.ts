export interface RdmDevice {
  uid: string
  manufacturerId: number
  deviceId: number
  manufacturerLabel?: string
  deviceModelDescription?: string
  deviceLabel?: string
  dmxStartAddress: number
  dmxPersonality: number
  personalityCount: number
}

export interface RdmDiscoveryStatus {
  isDiscovering: boolean
  devices: RdmDevice[]
}
