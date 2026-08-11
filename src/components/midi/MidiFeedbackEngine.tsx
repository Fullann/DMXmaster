import { useEffect } from 'react'
import { useMidiMappingStore } from '@/store/useMidiMappingStore'
import { useMidiStore } from '@/store/useMidiStore'
import { useChaserStore } from '@/store/useChaserStore'

// Colors for Novation Launchpad / APC (example velocity mapping)
const COLOR_OFF = 0
const COLOR_GREEN = 60
const COLOR_RED = 15

export function MidiFeedbackEngine() {
  const mappings = useMidiMappingStore(s => s.mappings)
  const sendMidiColor = useMidiStore(s => s.sendMidiColor)
  const chaserStatus = useChaserStore(s => s.status)

  useEffect(() => {
    // We run through all mappings to update their LED status
    mappings.forEach(mapping => {
      // We only send feedback for Notes (not CC faders)
      if (mapping.isCc) return

      let isActive = false
      let color = COLOR_OFF

      // Check if this mapping corresponds to an active state
      if (mapping.action.type === 'triggerChaser') {
        if (chaserStatus.isRunning && chaserStatus.chaserId === mapping.action.chaserId) {
          isActive = true
          color = COLOR_GREEN // Playing = Green
        } else if (chaserStatus.chaserId === mapping.action.chaserId) {
          isActive = true
          color = COLOR_RED // Paused/Selected = Red
        }
      }

      // Send the MIDI message to light up the button
      if (isActive) {
        sendMidiColor(mapping.noteOrCc, color)
      } else {
        // Turn off
        sendMidiColor(mapping.noteOrCc, COLOR_OFF)
      }
    })
  }, [mappings, sendMidiColor, chaserStatus.isRunning, chaserStatus.chaserId])

  return null
}
