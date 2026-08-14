import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useMidiStore } from '../../store/useMidiStore'

describe('useMidiStore (MTC Quarter Frame Decoding)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useMidiStore.setState({
      midiInputs: [],
      lastMessage: null,
      mtcTimeMs: 0,
      mtcActive: false
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should assemble MTC from 8 quarter frames and update mtcTimeMs', () => {
    const handleMidiData = useMidiStore.getState()._handleMidiData

    // Simulate sending 8 quarter frames (Time: 01:02:03:04 at 25fps)
    // Frame 0: Frames LSB (0x04 & 0x0F = 4)
    handleMidiData(new Uint8Array([0xF1, 0x04]))
    // Frame 1: Frames MSB (0x00 & 0x01 = 0)
    handleMidiData(new Uint8Array([0xF1, 0x10]))
    
    // Frame 2: Seconds LSB (0x03 & 0x0F = 3)
    handleMidiData(new Uint8Array([0xF1, 0x23]))
    // Frame 3: Seconds MSB (0x00 & 0x03 = 0)
    handleMidiData(new Uint8Array([0xF1, 0x30]))
    
    // Frame 4: Minutes LSB (0x02 & 0x0F = 2)
    handleMidiData(new Uint8Array([0xF1, 0x42]))
    // Frame 5: Minutes MSB (0x00 & 0x03 = 0)
    handleMidiData(new Uint8Array([0xF1, 0x50]))
    
    // Frame 6: Hours LSB (0x01 & 0x0F = 1)
    handleMidiData(new Uint8Array([0xF1, 0x61]))
    // Frame 7: Hours MSB & Rate (25fps = 01) -> (0x01 | 0x02 = 0x03)
    handleMidiData(new Uint8Array([0xF1, 0x72]))

    const state = useMidiStore.getState()
    
    // Time in ms:
    // 1 hr = 3600000 ms
    // 2 min = 120000 ms
    // 3 sec = 3000 ms
    // 4 frames @ 25fps = 160 ms
    // Total = 3723160 ms
    expect(state.mtcTimeMs).toBe(3723160)
    expect(state.mtcActive).toBe(true)
  })

  it('should deactivate MTC if no messages arrive after 500ms', () => {
    const handleMidiData = useMidiStore.getState()._handleMidiData
    const checkMtcActivity = useMidiStore.getState()._checkMtcActivity

    // Send a frame 7 to trigger mtcActive = true
    handleMidiData(new Uint8Array([0xF1, 0x72]))
    expect(useMidiStore.getState().mtcActive).toBe(true)
    
    vi.advanceTimersByTime(600)
    checkMtcActivity()
    
    expect(useMidiStore.getState().mtcActive).toBe(false)
  })
})
