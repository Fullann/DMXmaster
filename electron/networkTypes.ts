/** Maximum number of DMX universes the engine supports */
export const MAX_UNIVERSES = 8

export interface NetworkNode {
  id:             string
  name:           string
  ipAddress:      string
  protocol:       'ArtNet' | 'sACN'
  /** Art-Net universe index 0–15 (low 4 bits of the 15-bit Art-Net address) */
  targetUniverse: number
  /** Art-Net subnet 0–15 */
  subnet:         number
  /** Art-Net net 0–127 */
  net:            number
  active:         boolean
}

export interface NetworkConfig {
  nodes:             NetworkNode[]
  broadcastEnabled:  boolean
}
