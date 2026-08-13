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
  mtcTimeMs: number
  mtcFrameRate: number
  mtcActive: boolean
  
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

let mtcFrames = 0
let mtcSeconds = 0
let mtcMinutes = 0
let mtcHours = 0
let mtcRate = 30
let lastMtcReceiveTime = 0

export const useMidiStore = create<MidiState>((set, get) => ({
  midiStatus: 'requesting',
  midiInputs: [],
  lastMessage: null,
  mtcTimeMs: 0,
  mtcFrameRate: 30,
  mtcActive: false,

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
          const data = event.data
          // Handle MTC Quarter Frame (0xF1)
          if (data[0] === 0xF1) {
            const val = data[1]
            const type = (val >> 4) & 0x07
            const nibble = val & 0x0F

            switch (type) {
              case 0: mtcFrames = (mtcFrames & 0xF0) | nibble; break;
              case 1: mtcFrames = (mtcFrames & 0x0F) | (nibble << 4); break;
              case 2: mtcSeconds = (mtcSeconds & 0xF0) | nibble; break;
              case 3: mtcSeconds = (mtcSeconds & 0x0F) | (nibble << 4); break;
              case 4: mtcMinutes = (mtcMinutes & 0xF0) | nibble; break;
              case 5: mtcMinutes = (mtcMinutes & 0x0F) | (nibble << 4); break;
              case 6: mtcHours = (mtcHours & 0xF0) | nibble; break;
              case 7: 
                mtcHours = (mtcHours & 0x0F) | ((nibble & 0x01) << 4);
                const rateBits = (nibble >> 1) & 0x03;
                if (rateBits === 0) mtcRate = 24;
                else if (rateBits === 1) mtcRate = 25;
                else if (rateBits === 2) mtcRate = 29.97;
                else if (rateBits === 3) mtcRate = 30;
                
                // Full frame assembled
                const ms = (mtcHours * 3600 + mtcMinutes * 60 + mtcSeconds) * 1000 + Math.floor((mtcFrames * 1000) / mtcRate);
                lastMtcReceiveTime = performance.now();
                set({ mtcTimeMs: ms, mtcFrameRate: mtcRate, mtcActive: true });
                break;
            }
          } else {
            set({ lastMessage: parseMidiMessage(event) })
          }
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

        // MTC Activity Watchdog (turn off active state if no MTC received for 500ms)
        setInterval(() => {
          if (get().mtcActive && performance.now() - lastMtcReceiveTime > 500) {
            set({ mtcActive: false })
          }
        }, 500)
      })
      .catch(() => set({ midiStatus: 'denied' }))

    return () => {
      midiAccess?.inputs.forEach(input => {
        input.onmidimessage = null
      })
    }
  }
}))
