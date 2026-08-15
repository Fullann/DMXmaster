import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'
import type { FixtureProfile, FixtureChannel, ChannelType } from './fixtureTypes'

/**
 * Maps a GDTF Attribute to our internal ChannelType.
 */
function mapGdtfAttribute(attr: string): ChannelType {
  const a = attr.toLowerCase()
  if (a.includes('dimmer') || a.includes('intensity')) return 'Intensity'
  if (a.includes('pan')) return 'Pan'
  if (a.includes('tilt')) return 'Tilt'
  if (a.includes('red')) return 'Red'
  if (a.includes('green')) return 'Green'
  if (a.includes('blue')) return 'Blue'
  if (a.includes('white')) return 'White'
  if (a.includes('color')) return 'Color'
  if (a.includes('shutter') || a.includes('strobe')) return 'Shutter'
  if (a.includes('gobo')) return 'Gobo'
  if (a.includes('prism')) return 'Prism'
  if (a.includes('zoom')) return 'Zoom'
  if (a.includes('focus')) return 'Focus'
  if (a.includes('smoke') || a.includes('fog')) return 'Smoke'
  if (a.includes('speed')) return 'Speed'
  if (a.includes('effect') || a.includes('macro')) return 'Effect'
  return 'Unknown'
}

export function parseGdtf(filePath: string): FixtureProfile {
  // 1. Extract description.xml from the .gdtf zip archive
  const zip = new AdmZip(filePath)
  const xmlEntry = zip.getEntry('description.xml')
  
  if (!xmlEntry) {
    throw new Error('Invalid GDTF file: description.xml not found.')
  }
  
  const xmlData = xmlEntry.getData().toString('utf8')
  
  // 2. Parse XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  })
  
  const doc = parser.parse(xmlData)
  
  const fixtureType = doc.GDTF?.FixtureType
  if (!fixtureType) {
    throw new Error('Invalid GDTF: <FixtureType> not found.')
  }
  
  const manufacturer = fixtureType['@_Manufacturer'] || 'Unknown Manufacturer'
  const model = fixtureType['@_Name'] || fixtureType['@_ShortName'] || 'Unknown Model'
  
  // 3. Find the first DMX Mode
  // GDTF arrays can be either a single object or an array of objects depending on fast-xml-parser
  let dmxModes = fixtureType.DMXModes?.DMXMode
  if (!dmxModes) {
    throw new Error('No DMX Modes found in GDTF.')
  }
  
  // Ensure array
  if (!Array.isArray(dmxModes)) {
    dmxModes = [dmxModes]
  }
  
  const firstMode = dmxModes[0]
  const modeName = firstMode['@_Name'] || 'Default Mode'
  
  let dmxChannels = firstMode.DMXChannels?.DMXChannel || []
  if (!Array.isArray(dmxChannels)) {
    dmxChannels = [dmxChannels]
  }
  
  // 4. Map Channels
  const channels: FixtureChannel[] = []
  
  let channelNumber = 1
  for (const ch of dmxChannels) {
    // The Offset can be something like "1", "1,2", etc. We'll just assign sequentially for simplicity
    // or try to parse Offset if needed. Sequential is usually safer if we assume they are listed in order.
    // Wait, GDTF DMXChannel defines Offset="1". Let's use Offset if available.
    
    let offsetStr = ch['@_Offset']
    let offset = channelNumber
    if (offsetStr) {
      // Offset can be "1,2" for 16-bit. We'll just take the first one (MSB).
      const firstOffset = parseInt(offsetStr.split(',')[0], 10)
      if (!isNaN(firstOffset)) {
        offset = firstOffset
      }
    }
    
    // GDTF stores logical channel attributes usually in LogicalChannel
    let logicalChannel = ch.LogicalChannel
    if (Array.isArray(logicalChannel)) logicalChannel = logicalChannel[0] // take first
    
    const attributeName = logicalChannel?.['@_Attribute'] || 'Unknown'
    
    const defaultValueParts = ch['@_Default']?.split('/') || ['0']
    const defaultValue = parseInt(defaultValueParts[0], 10) || 0
    
    channels.push({
      number: offset,
      name: attributeName,
      type: mapGdtfAttribute(attributeName),
      defaultValue: Math.min(255, Math.max(0, defaultValue)) // clamp 0-255
    })
    
    channelNumber++
  }
  
  // Sort by offset in case they were out of order
  channels.sort((a, b) => a.number - b.number)
  
  // Re-index sequentially to fix gaps or 16-bit holes, as our internal engine is 8-bit sequential
  channels.forEach((c, i) => {
    c.number = i + 1
  })
  
  return {
    manufacturer,
    model,
    mode: modeName,
    channels
  }
}
