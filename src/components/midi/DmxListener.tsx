import { useEffect } from 'react'
import { useDmxMappingStore } from '@/store/useDmxMappingStore'
import { useLiveGridStore } from '@/store/useLiveGridStore'
import { useChaserStore } from '@/store/useChaserStore'

export function DmxListener() {
  
  useEffect(() => {
    // Listen to IPC event
    const handleDmxIn = (data: { universe: number, channel: number, value: number }) => {
      const { universe, channel, value } = data

      // 1. Are we in Learn Mode waiting for a hardware input?
      const { learnMode, targetAction, targetLabel, addMapping } = useDmxMappingStore.getState()
      
      if (learnMode && targetAction) {
        addMapping({
          universe,
          channel,
          action: targetAction,
          label: targetLabel ?? 'Unknown Action'
        })
        return // Don't execute actions while learning
      }

      // 2. Execute mappings
      const mappings = useDmxMappingStore.getState().mappings
      
      for (const m of mappings) {
        if (m.universe === universe && m.channel === channel) {
          
          // Execute Action
          const action = m.action
          const isTrigger = value > 127 // For buttons (0-127 is off, 128-255 is on)
          
          if (action.type === 'softBlackout' && isTrigger) {
            window.dmxAPI.softBlackout()
          } 
          else if (action.type === 'triggerGridCell' && isTrigger) {
            useLiveGridStore.getState().toggleNote(action.note)
          }
          else if (action.type === 'triggerChaser' && isTrigger) {
            const chaser = useChaserStore.getState().chasers.find(c => c.id === action.chaserId)
            if (chaser) {
              if (chaser.active) window.chaserAPI.stop()
              else window.chaserAPI.start(chaser.id)
            }
          }
          else if (action.type === 'setGrandMaster') {
            // DMX is already 0-255
            window.fixtureAPI.setGrandMaster(value)
          }
          else if (action.type === 'triggerScene' && isTrigger) {
            window.sceneAPI.recallScene(action.sceneId)
          }
        }
      }
    }

    if (window.networkAPI && window.networkAPI.onDmxInChange) {
      window.networkAPI.onDmxInChange(handleDmxIn)
    }
  }, [])

  return null
}
