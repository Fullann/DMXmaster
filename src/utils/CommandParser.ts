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
  type: 'selection' | 'intensity' | 'mixed' | 'clear' | 'unknown'
  selectedUserNumbers: number[]
  intensityValue?: number // 0-255
}

export function parseCommand(input: string, currentSelection: number[] = []): ParsedCommand {
  const normalized = input.trim().toUpperCase()
  if (!normalized) return { type: 'unknown', selectedUserNumbers: currentSelection }

  // Special commands
  if (normalized === 'CLEAR') {
    return { type: 'clear', selectedUserNumbers: [] }
  }

  // Split selection part and intensity part
  const parts = normalized.split('@')
  const selectionPart = parts[0].trim()
  const intensityPart = parts.length > 1 ? parts[1].trim() : null

  let newSelection = new Set<number>(currentSelection)
  let isSelectionModified = false

  if (selectionPart) {
    // If the string starts with a number or THRU, we clear current selection
    // (unless it starts with + or -)
    if (/^[0-9]/.test(selectionPart) || selectionPart.startsWith('THRU')) {
      newSelection.clear()
    }
    
    // Simple state machine for parsing selection
    // Tokens: NUMBER, +, -, THRU
    const tokens = selectionPart.match(/([0-9]+|\+|-|THRU)/g)
    if (tokens) {
      let mode: 'add' | 'subtract' = 'add'
      let lastNumber: number | null = null

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]

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

  if (intensityPart !== null) {
    hasIntensity = true
    if (intensityPart === 'FULL' || intensityPart === 'FF') {
      intensityValue = 255
    } else if (intensityPart === 'OUT') {
      intensityValue = 0
    } else {
      const val = parseInt(intensityPart, 10)
      if (!isNaN(val)) {
        // Percentage (0-100) converted to DMX (0-255)
        const pct = Math.max(0, Math.min(100, val))
        intensityValue = Math.round((pct / 100) * 255)
      } else {
        hasIntensity = false
      }
    }
  }

  const selectedArray = Array.from(newSelection).sort((a, b) => a - b)

  if (isSelectionModified && hasIntensity) {
    return { type: 'mixed', selectedUserNumbers: selectedArray, intensityValue }
  } else if (isSelectionModified) {
    return { type: 'selection', selectedUserNumbers: selectedArray }
  } else if (hasIntensity) {
    return { type: 'intensity', selectedUserNumbers: selectedArray, intensityValue }
  }

  return { type: 'unknown', selectedUserNumbers: selectedArray }
}
