import { useEffect } from 'react'
import { useMidiStore } from '@/store/useMidiStore'
import { useMidiMappingStore } from '@/store/useMidiMappingStore'
import { useLiveGridStore } from '@/store/useLiveGridStore'
import { useChaserStore } from '@/store/useChaserStore'

export function MidiListener() {
  const lastMessage = useMidiStore(s => s.lastMessage)
  
  useEffect(() => {
    if (!lastMessage) return

    const { type, channel, note, velocity } = lastMessage
    const isCc = type === 'cc'
    const noteOrCc = note

    // 1. Are we in Learn Mode waiting for a hardware input?
    const { learnMode, targetAction, targetLabel, addMapping } = useMidiMappingStore.getState()
    
    if (learnMode && targetAction) {
      if (type === 'noteOn' || type === 'cc') {
        addMapping({
          channel,
          noteOrCc,
          isCc,
          action: targetAction,
          label: targetLabel ?? 'Unknown Action'
        })
      }
      return // Don't execute actions while learning
    }

    // 2. Execute mappings
    const mappings = useMidiMappingStore.getState().mappings
    
    for (const m of mappings) {
      if (m.channel === channel && m.noteOrCc === noteOrCc && m.isCc === isCc) {
        
        // Execute Action
        const action = m.action
        
        if (action.type === 'softBlackout' && type === 'noteOn') {
          window.dmxAPI.softBlackout()
        } 
        else if (action.type === 'triggerGridCell' && type === 'noteOn') {
          useLiveGridStore.getState().toggleNote(action.note)
        }
        else if (action.type === 'triggerChaser' && type === 'noteOn') {
          const chaser = useChasersStore.getState().chasers.find(c => c.id === action.chaserId)
          if (chaser) {
            if (chaser.active) window.chaserAPI.stop()
            else window.chaserAPI.start(chaser.id)
          }
        }
        else if (action.type === 'setGrandMaster' && type === 'cc') {
          // CC velocity is usually 0-127
          const level = Math.round((velocity / 127) * 255)
          window.fixtureAPI.setGrandMaster(level)
        }
        else if (action.type === 'triggerScene' && type === 'noteOn') {
          window.sceneAPI.recallScene(action.sceneId)
        }
      }
    }
  }, [lastMessage])

  return null
}
