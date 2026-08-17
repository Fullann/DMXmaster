import * as THREE from 'three'

/**
 * Calculates the final color of a virtual fixture based on DMX values and its profile.
 * @param channelMap - The channel map linking channel types to DMX addresses
 * @param universe - The raw DMX universe data
 * @returns A THREE.Color object representing the color of the fixture
 */
export function calculateFixtureColor(channelMap: Record<string, number>, universe: Uint8Array): THREE.Color {
  // Determine if fixture has any RGB channels
  const hasRGB = channelMap['Red'] !== undefined || channelMap['Green'] !== undefined || channelMap['Blue'] !== undefined
  
  // If it has RGB channels, missing ones default to 0. Otherwise, they all default to 255 (white).
  const defaultColor = hasRGB ? 0 : 255
  
  const rDmx = channelMap['Red'] !== undefined ? universe[channelMap['Red']] : defaultColor
  const gDmx = channelMap['Green'] !== undefined ? universe[channelMap['Green']] : defaultColor
  const bDmx = channelMap['Blue'] !== undefined ? universe[channelMap['Blue']] : defaultColor

  return new THREE.Color(rDmx / 255, gDmx / 255, bDmx / 255)
}
