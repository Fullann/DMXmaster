import { create } from 'zustand'
import { parseCommand } from '@/utils/CommandParser'
import { useFixturesStore } from './useFixturesStore'
import { useScenesStore } from './useScenesStore'
import { useHistoryStore } from './useHistoryStore'

// Auto-clear timer reference
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

export interface CliState {
  commandBuffer: string
  selectedUserNumbers: number[]
  lastFeedback: string
  history: string[]
  historyIndex: number
  
  setCommandBuffer: (cmd: string) => void
  executeCommand: () => void
  clearSelection: () => void
  navigateHistory: (direction: 'up' | 'down') => void
}

export const useCliStore = create<CliState>((set, get) => ({
  commandBuffer: '',
  selectedUserNumbers: [],
  lastFeedback: '',
  history: [],
  historyIndex: -1,

  setCommandBuffer: (cmd: string) => set({ commandBuffer: cmd, historyIndex: -1 }),

  navigateHistory: (direction: 'up' | 'down') => {
    const { history, historyIndex } = get()
    if (history.length === 0) return

    let newIndex = historyIndex
    if (direction === 'up') {
      newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
    } else {
      if (historyIndex === -1) return
      newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : -1
    }

    if (newIndex === -1) {
      set({ historyIndex: -1, commandBuffer: '' })
    } else {
      set({ historyIndex: newIndex, commandBuffer: history[newIndex] })
    }
  },

  executeCommand: () => {
    const { commandBuffer, selectedUserNumbers, history } = get()
    const cmdStr = commandBuffer.trim()
    if (!cmdStr) return

    const fixturesStore = useFixturesStore.getState()
    const resolveGroup = (groupName: string): number[] => {
      const { groups, patch } = fixturesStore
      // Find group by name or index
      const group = groups.find(g => g.name.toUpperCase() === groupName.toUpperCase())
                 || groups.find(g => g.id === groupName)
                 || groups[parseInt(groupName, 10) - 1]
      
      if (!group) return []
      
      const unums: number[] = []
      for (const fid of group.fixtureIds) {
        const fix = patch.find(f => f.id === fid)
        if (fix && fix.userNumber !== undefined) unums.push(fix.userNumber)
      }
      return unums
    }

    const parsed = parseCommand(cmdStr, selectedUserNumbers, resolveGroup)
    
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

      // Capture history before modifications
      if (['intensity', 'mixed', 'fan', 'mixed_fan'].includes(parsed.type)) {
        useHistoryStore.getState().pushCurrentState(cmdStr)
      }

      if (parsed.type === 'intensity' || parsed.type === 'mixed') {
        const val = parsed.intensityValue!
        const fixturesStore = useFixturesStore.getState()
        const patch = fixturesStore.patch
        
        // Pre-index by userNumber for O(1) lookup instead of O(n) per fixture
        const byUserNumber = new Map(patch.map(f => [f.userNumber, f]))
        
        let appliedCount = 0
        for (const unum of newSelection) {
          const fixture = byUserNumber.get(unum)
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

      if (parsed.type === 'fan' || parsed.type === 'mixed_fan') {
        const { fanChannel, fanStart, fanEnd, isSymmetric } = parsed
        if (fanChannel && fanStart !== undefined && fanEnd !== undefined) {
          const fixturesStore = useFixturesStore.getState()
          const patch = fixturesStore.patch
          const byUserNumber = new Map(patch.map(f => [f.userNumber, f]))
          
          let appliedCount = 0
          const total = newSelection.length
          
          newSelection.forEach((unum, index) => {
            const fixture = byUserNumber.get(unum)
            if (fixture) {
              let fraction = total > 1 ? index / (total - 1) : 0.5
              
              if (isSymmetric) {
                const center = (total - 1) / 2
                const dist = Math.abs(index - center)
                fraction = center === 0 ? 0.5 : 1 - (dist / center)
              }
              
              const val = Math.round(fanStart + fraction * (fanEnd - fanStart))
              fixturesStore.sendCommand(fixture.id, fanChannel as any, val)
              appliedCount++
            }
          })
          
          if (appliedCount > 0) {
            feedback += (feedback ? ' | ' : '') + `FAN ${fanChannel} ${Math.round((fanStart/255)*100)}% THRU ${Math.round((fanEnd/255)*100)}%${isSymmetric ? ' SYMMETRIC' : ''}`
          } else {
            feedback += (feedback ? ' | ' : '') + `No valid fixtures for fan.`
          }
        }
      }

      if (parsed.type === 'unknown') {
        feedback = 'Syntax Error'
      }
    }

    const newHistory = history.length === 0 || history[history.length - 1] !== cmdStr 
      ? [...history.slice(-49), cmdStr] // Keep last 50
      : history;

    set({ 
      commandBuffer: '', 
      history: newHistory,
      historyIndex: -1,
      selectedUserNumbers: newSelection,
      lastFeedback: feedback
    })

    // Auto-clear feedback after 3 seconds
    if (feedbackTimer) clearTimeout(feedbackTimer)
    feedbackTimer = setTimeout(() => {
      useCliStore.setState({ lastFeedback: '' })
      feedbackTimer = null
    }, 3000)
  },

  clearSelection: () => set({ selectedUserNumbers: [] })
}))
