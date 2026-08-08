import { create } from 'zustand'

export type MidiMessageType = 'noteOn' | 'noteOff' | 'cc' | 'pitchBend' | 'unknown'
export type MidiStatus      = 'requesting' | 'granted' | 'denied' | 'unavailable' | 'error'

export interface ParsedMidiMessage {
  type:      MidiMessageType
  channel:   number
  note:      number
  velocity:  number
  raw:       number[]
  timestamp: number
}

export interface MidiDevice {
  id:           string
  name:         string
  manufacturer: string
}

export interface MidiState {
  midiStatus: MidiStatus
  midiInputs: MidiDevice[]
  lastMessage: ParsedMidiMessage | null
  
  sendMidiColor: (noteNumber: number, colorVelocity: number) => void
  init: () => () => void
}

const parseMidiMessage = (event: MIDIMessageEvent): ParsedMidiMessage => {
  const data = event.data
  const status = data[0]
  const type4bit = status & 0xf0
  const channel = status & 0x0f
  const note = data[1] ?? 0
  const velocity = data[2] ?? 0

  let type: MidiMessageType = 'unknown'
  if (type4bit === 0x90 && velocity > 0) type = 'noteOn'
  else if (type4bit === 0x80 || (type4bit === 0x90 && velocity === 0)) type = 'noteOff'
  else if (type4bit === 0xb0) type = 'cc'
  else if (type4bit === 0xe0) type = 'pitchBend'

  return { type, channel, note, velocity, raw: Array.from(data), timestamp: event.timeStamp }
}

export const useMidiStore = create<MidiState>((set, get) => ({
  midiStatus: 'requesting',
  midiInputs: [],
  lastMessage: null,

  sendMidiColor: (noteNumber, colorVelocity) => {
    if (!navigator.requestMIDIAccess) return
    navigator.requestMIDIAccess().then(access => {
      access.outputs.forEach(output => {
        output.send([0x90, noteNumber, Math.max(0, Math.min(127, colorVelocity))])
      })
    })
  },

  init: () => {
    if (!navigator.requestMIDIAccess) {
      set({ midiStatus: 'unavailable' })
      return () => {}
    }

    let midiAccess: MIDIAccess | null = null

    const registerInputs = (access: MIDIAccess) => {
      const devices: MidiDevice[] = []
      access.inputs.forEach(input => {
        devices.push({
          id: input.id,
          name: input.name ?? `Unknown Device (${input.id})`,
          manufacturer: input.manufacturer ?? '',
        })
        input.onmidimessage = (event: MIDIMessageEvent) => {
          set({ lastMessage: parseMidiMessage(event) })
        }
      })
      set({ midiInputs: devices })
    }

    navigator.requestMIDIAccess({ sysex: false })
      .then(access => {
        midiAccess = access
        set({ midiStatus: 'granted' })
        registerInputs(access)
        access.onstatechange = () => registerInputs(access)
      })
      .catch(() => set({ midiStatus: 'denied' }))

    return () => {
      midiAccess?.inputs.forEach(input => {
        input.onmidimessage = null
      })
    }
  }
}))
