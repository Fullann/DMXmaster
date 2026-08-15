import { create } from 'zustand'
import { parseCommand } from '@/utils/CommandParser'
import { useFixturesStore } from './useFixturesStore'
import { useScenesStore } from './useScenesStore'

export interface CliState {
  commandBuffer: string
  selectedUserNumbers: number[]
  lastFeedback: string
  
  setCommandBuffer: (cmd: string) => void
  executeCommand: () => void
  clearSelection: () => void
}

export const useCliStore = create<CliState>((set, get) => ({
  commandBuffer: '',
  selectedUserNumbers: [],
  lastFeedback: '',

  setCommandBuffer: (cmd: string) => set({ commandBuffer: cmd }),

  executeCommand: () => {
    const { commandBuffer, selectedUserNumbers } = get()
    if (!commandBuffer.trim()) return

    const parsed = parseCommand(commandBuffer, selectedUserNumbers)
    
    let newSelection = parsed.selectedUserNumbers
    let feedback = ''

    if (parsed.type === 'clear') {
      useScenesStore.getState().clearProgrammer()
      newSelection = []
      feedback = 'Programmer Cleared'
    } else {
      if (parsed.type === 'selection' || parsed.type === 'mixed') {
        feedback = `Selected: ${newSelection.join(', ')}`
      }

      if (parsed.type === 'intensity' || parsed.type === 'mixed') {
        const val = parsed.intensityValue!
        const fixturesStore = useFixturesStore.getState()
        const patch = fixturesStore.patch
        
        let appliedCount = 0
        for (const unum of newSelection) {
          const fixture = patch.find(f => f.userNumber === unum)
          if (fixture) {
            fixturesStore.sendCommand(fixture.id, 'Intensity', val)
            appliedCount++
          }
        }
        
        if (appliedCount > 0) {
          feedback += (feedback ? ' | ' : '') + `Intensity @ ${Math.round((val / 255) * 100)}%`
        } else {
          feedback += (feedback ? ' | ' : '') + `No valid fixtures to set intensity.`
        }
      }

      if (parsed.type === 'unknown') {
        feedback = 'Syntax Error'
      }
    }

    set({ 
      commandBuffer: '', 
      selectedUserNumbers: newSelection,
      lastFeedback: feedback
    })
  },

  clearSelection: () => set({ selectedUserNumbers: [] })
}))
