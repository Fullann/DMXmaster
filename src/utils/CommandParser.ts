/**
 * CommandParser.ts
 * Parses GrandMA-style command line syntax for fixture selection and intensity control.
 * 
 * Syntax examples:
 * "1" -> Select fixture 1
 * "1 + 3" -> Select fixture 1 and 3
 * "1 THRU 10" -> Select fixtures 1 through 10
 * "- 5" -> Remove fixture 5 from selection (if previous selection exists)
 * "1 THRU 10 - 5" -> Select 1 through 10 except 5
 * "@ 50" -> Set intensity of selected fixtures to 50%
 * "1 THRU 10 @ 50" -> Select 1 through 10 and set intensity to 50%
 * "@ FULL" / "@ FF" -> Set intensity to 100%
 * "@ OUT" / "@ 0" -> Set intensity to 0%
 */

export interface ParsedCommand {
  type: 'selection' | 'intensity' | 'mixed' | 'clear' | 'unknown' | 'fan' | 'mixed_fan'
  selectedUserNumbers: number[]
  intensityValue?: number // 0-255
  fanChannel?: string
  fanStart?: number // 0-255
  fanEnd?: number // 0-255
}

export function parseCommand(
  input: string,
  currentSelection: number[] = [],
  resolveGroup?: (groupName: string) => number[]
): ParsedCommand {
  const normalized = input.trim().toUpperCase()
  if (!normalized) return { type: 'unknown', selectedUserNumbers: currentSelection }

  // Special commands
  if (normalized === 'CLEAR') {
    return { type: 'clear', selectedUserNumbers: [] }
  }

  // Split selection part and action part (intensity or fan)
  let selectionPart = normalized
  let actionPart: string | null = null
  let isExplicitFan = false

  if (normalized.includes(' FAN ')) {
    const parts = normalized.split(' FAN ')
    selectionPart = parts[0].trim()
    actionPart = parts.slice(1).join(' FAN ').trim()
    isExplicitFan = true
  } else if (normalized.includes('@')) {
    const parts = normalized.split('@')
    selectionPart = parts[0].trim()
    actionPart = parts.slice(1).join('@').trim()
  }

  let newSelection = new Set<number>(currentSelection)
  let isSelectionModified = false

  if (selectionPart) {
    // If the string starts with a number or THRU, we clear current selection
    // (unless it starts with + or -)
    if (/^[0-9]/.test(selectionPart) || selectionPart.startsWith('THRU') || selectionPart.startsWith('GROUP')) {
      newSelection.clear()
    }
    
    // Simple state machine for parsing selection
    // Tokens: NUMBER, +, -, THRU, GROUP, or words
    const tokens = selectionPart.match(/([0-9]+|[a-zA-Z_]+|\+|-)/g)
    if (tokens) {
      let mode: 'add' | 'subtract' = 'add'
      let lastNumber: number | null = null

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i].toUpperCase()

        if (token === '+') {
          mode = 'add'
        } else if (token === '-') {
          mode = 'subtract'
        } else if (token === 'THRU') {
          // Handle THRU
          const nextToken = tokens[i + 1]
          if (nextToken && /^[0-9]+$/.test(nextToken)) {
            const endNum = parseInt(nextToken, 10)
            if (lastNumber !== null) {
              const start = Math.min(lastNumber, endNum)
              const end = Math.max(lastNumber, endNum)
              for (let n = start; n <= end; n++) {
                if (mode === 'add') newSelection.add(n)
                else newSelection.delete(n)
              }
            }
            lastNumber = endNum
            i++ // Skip next token as we consumed it
          }
        } else if (token === 'GROUP') {
          const nextToken = tokens[i + 1]
          if (nextToken) {
            if (resolveGroup) {
              const groupUnums = resolveGroup(nextToken)
              for (const n of groupUnums) {
                if (mode === 'add') newSelection.add(n)
                else newSelection.delete(n)
              }
            }
            i++ // Skip next token
          }
        } else if (/^[0-9]+$/.test(token)) {
          const num = parseInt(token, 10)
          if (mode === 'add') newSelection.add(num)
          else newSelection.delete(num)
          lastNumber = num
        }
      }
      isSelectionModified = true
    }
  }

  let intensityValue: number | undefined = undefined
  let hasIntensity = false

  let hasFan = false
  let fanChannel = 'Intensity'
  let fanStart: number | undefined = undefined
  let fanEnd: number | undefined = undefined

  if (actionPart !== null) {
    if (isExplicitFan || actionPart.includes('THRU')) {
      hasFan = true
      // Parse FAN TILT 0 THRU 255 or 0 THRU 100
      const thruMatch = actionPart.match(/(-?[0-9]+)\s+THRU\s+(-?[0-9]+)/)
      if (thruMatch) {
        let pStart = parseInt(thruMatch[1], 10)
        let pEnd = parseInt(thruMatch[2], 10)
        
        // Try to find a channel type before the numbers
        const beforeNumbers = actionPart.substring(0, thruMatch.index).trim()
        if (beforeNumbers && isExplicitFan) {
          fanChannel = beforeNumbers.charAt(0).toUpperCase() + beforeNumbers.slice(1).toLowerCase()
          // For non-intensity (like Pan/Tilt), we assume DMX values 0-255 or - degrees? 
          // Let's stick to DMX values 0-255 for now unless it's percentage. 
          // If it's explicitly Intensity, or implicitly, we scale 0-100 to 0-255
          if (fanChannel === 'Intensity') {
             fanStart = Math.round((Math.max(0, Math.min(100, pStart)) / 100) * 255)
             fanEnd = Math.round((Math.max(0, Math.min(100, pEnd)) / 100) * 255)
          } else {
             fanStart = Math.max(0, Math.min(255, pStart))
             fanEnd = Math.max(0, Math.min(255, pEnd))
          }
        } else {
          // Default to Intensity (percentage)
          fanChannel = 'Intensity'
          fanStart = Math.round((Math.max(0, Math.min(100, pStart)) / 100) * 255)
          fanEnd = Math.round((Math.max(0, Math.min(100, pEnd)) / 100) * 255)
        }
      } else {
        hasFan = false // Malformed fan
      }
    } else {
      hasIntensity = true
      if (actionPart === 'FULL' || actionPart === 'FF') {
        intensityValue = 255
      } else if (actionPart === 'OUT') {
        intensityValue = 0
      } else {
        const val = parseInt(actionPart, 10)
        if (!isNaN(val)) {
          // Percentage (0-100) converted to DMX (0-255)
          const pct = Math.max(0, Math.min(100, val))
          intensityValue = Math.round((pct / 100) * 255)
        } else {
          hasIntensity = false
        }
      }
    }
  }

  const selectedArray = Array.from(newSelection).sort((a, b) => a - b)

  if (isSelectionModified && hasFan) {
    return { type: 'mixed_fan', selectedUserNumbers: selectedArray, fanChannel, fanStart, fanEnd }
  } else if (hasFan) {
    return { type: 'fan', selectedUserNumbers: selectedArray, fanChannel, fanStart, fanEnd }
  } else if (isSelectionModified && hasIntensity) {
    return { type: 'mixed', selectedUserNumbers: selectedArray, intensityValue }
  } else if (isSelectionModified) {
    return { type: 'selection', selectedUserNumbers: selectedArray }
  } else if (hasIntensity) {
    return { type: 'intensity', selectedUserNumbers: selectedArray, intensityValue }
  }

  return { type: 'unknown', selectedUserNumbers: selectedArray }
}
