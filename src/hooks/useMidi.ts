import { useState, useCallback, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// useMidi — Web MIDI API hook.
//
// Requests MIDI access, parses incoming messages, and exposes the last
// received message. The hook handles device hotplug via onstatechange.
//
// Note: navigator.requestMIDIAccess() is fully available in Electron's
// Chromium renderer — no polyfills needed.
// ─────────────────────────────────────────────────────────────────────────────

export type MidiMessageType = 'noteOn' | 'noteOff' | 'cc' | 'pitchBend' | 'unknown'
export type MidiStatus      = 'requesting' | 'granted' | 'denied' | 'unavailable' | 'error'

export interface ParsedMidiMessage {
  type:      MidiMessageType
  channel:   number   // 0–15 (MIDI channel minus 1)
  note:      number   // 0–127 (or CC number)
  velocity:  number   // 0–127 (or CC value)
  raw:       number[]
  timestamp: number
}

export interface MidiDevice {
  id:           string
  name:         string
  manufacturer: string
}

// ─────────────────────────────────────────────────────────────────────────────

export function useMidi() {
  const [midiStatus, setMidiStatus]   = useState<MidiStatus>('requesting')
  const [midiInputs, setMidiInputs]   = useState<MidiDevice[]>([])
  const [lastMessage, setLastMessage] = useState<ParsedMidiMessage | null>(null)

  // ── Message parser ──────────────────────────────────────────────────────────

  const parseMidiMessage = useCallback((event: MIDIMessageEvent): ParsedMidiMessage => {
    const data     = event.data
    const status   = data[0]
    const type4bit = status & 0xf0
    const channel  = status & 0x0f
    const note     = data[1] ?? 0
    const velocity = data[2] ?? 0

    let type: MidiMessageType = 'unknown'

    if (type4bit === 0x90 && velocity > 0) {
      type = 'noteOn'
    } else if (type4bit === 0x80 || (type4bit === 0x90 && velocity === 0)) {
      // Note-off OR note-on with velocity 0 (running status convention)
      type = 'noteOff'
    } else if (type4bit === 0xb0) {
      type = 'cc'
    } else if (type4bit === 0xe0) {
      type = 'pitchBend'
    }

    return {
      type,
      channel,
      note,
      velocity,
      raw: Array.from(data),
      timestamp: event.timeStamp,
    }
  }, [])

  // ── Device registration ─────────────────────────────────────────────────────

  const registerInputs = useCallback((access: MIDIAccess) => {
    const devices: MidiDevice[] = []

    access.inputs.forEach((input) => {
      devices.push({
        id:           input.id,
        name:         input.name  ?? `Unknown Device (${input.id})`,
        manufacturer: input.manufacturer ?? '',
      })

      input.onmidimessage = (event: MIDIMessageEvent) => {
        const parsed = parseMidiMessage(event)
        setLastMessage(parsed)
      }
    })

    setMidiInputs(devices)
  }, [parseMidiMessage])

  // ── MIDI access ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      setMidiStatus('unavailable')
      return
    }

    let midiAccess: MIDIAccess | null = null

    navigator.requestMIDIAccess({ sysex: false })
      .then((access) => {
        midiAccess = access
        setMidiStatus('granted')
        registerInputs(access)

        // Hot-plug support: re-register whenever a device connects/disconnects
        access.onstatechange = () => {
          registerInputs(access)
        }
      })
      .catch(() => {
        setMidiStatus('denied')
      })

    // Cleanup: remove all message handlers on unmount
    return () => {
      midiAccess?.inputs.forEach((input) => {
        input.onmidimessage = null
      })
    }
  }, [registerInputs])

  // ── MIDI OUT ────────────────────────────────────────────────────────────────

  /**
   * Sends a MIDI Note On message with the specified velocity to all connected outputs.
   * 
   * Launchpad Convention:
   * Novation Launchpads use the velocity value of a Note On message to determine the LED color.
   * Standard palette:
   *  0 = Off
   *  13 = Red (dim), 15 = Red (bright)
   *  29 = Amber (dim), 63 = Amber (bright)
   *  28 = Green (dim), 60 = Green (bright)
   *  47 = Yellow, 43 = Mint, 33 = Blue, 49 = Purple
   */
  const sendMidiColor = useCallback((noteNumber: number, colorVelocity: number) => {
    if (!navigator.requestMIDIAccess) return
    navigator.requestMIDIAccess().then(access => {
      access.outputs.forEach(output => {
        // Send Note On (0x90 for Channel 1) with the specified note and velocity
        output.send([0x90, noteNumber, Math.max(0, Math.min(127, colorVelocity))])
      })
    })
  }, [])

  return { midiStatus, midiInputs, lastMessage, sendMidiColor }
}
