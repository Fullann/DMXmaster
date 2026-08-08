import type { MidiStatus, ParsedMidiMessage, MidiDevice } from '@/hooks/useMidi'

// ─────────────────────────────────────────────────────────────────────────────
// MidiMonitor — debug widget showing MIDI status, devices, and last message.
// ─────────────────────────────────────────────────────────────────────────────

interface MidiMonitorProps {
  midiStatus:  MidiStatus
  midiInputs:  MidiDevice[]
  lastMessage: ParsedMidiMessage | null
}

const STATUS_LABEL: Record<MidiStatus, string> = {
  requesting:  'Requesting…',
  granted:     'Active',
  denied:      'Access Denied',
  unavailable: 'Unavailable',
  error:       'Error',
}

const STATUS_CLASS: Record<MidiStatus, string> = {
  requesting:  'midi-status--pending',
  granted:     'midi-status--active',
  denied:      'midi-status--error',
  unavailable: 'midi-status--error',
  error:       'midi-status--error',
}

const MSG_TYPE_COLOR: Record<string, string> = {
  noteOn:     'var(--midi-active)',
  noteOff:    'var(--text-secondary)',
  cc:         'var(--accent-light)',
  pitchBend:  'var(--status-warn)',
  unknown:    'var(--text-muted)',
}

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
function noteToName(note: number): string {
  return `${NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`
}

export function MidiMonitor({ midiStatus, midiInputs, lastMessage }: MidiMonitorProps) {
  return (
    <div className="panel midi-panel">
      <div className="panel-header">
        <span className="panel-title">MIDI INPUT</span>
        <span className={`midi-status-badge ${STATUS_CLASS[midiStatus]}`}>
          {STATUS_LABEL[midiStatus]}
        </span>
      </div>

      {/* Device list */}
      <div className="midi-device-list">
        {midiInputs.length === 0 ? (
          <div className="midi-no-devices">
            {midiStatus === 'granted'
              ? 'No MIDI devices detected'
              : midiStatus === 'requesting'
              ? 'Waiting for access…'
              : 'MIDI unavailable'}
          </div>
        ) : (
          midiInputs.map((device) => (
            <div key={device.id} className="midi-device-item">
              <span className="midi-device-dot" />
              <span className="midi-device-name">{device.name}</span>
            </div>
          ))
        )}
      </div>

      {/* Last message display */}
      <div className="midi-message-container">
        <div className="panel-sublabel">Last Message</div>
        {lastMessage ? (
          <div className="midi-message">
            <div
              className="midi-msg-type"
              style={{ color: MSG_TYPE_COLOR[lastMessage.type] }}
            >
              {lastMessage.type.toUpperCase()}
            </div>
            <div className="midi-msg-details">
              <span className="midi-msg-field">
                <span className="midi-msg-key">Note</span>
                <span className="midi-msg-val">
                  {noteToName(lastMessage.note)}{' '}
                  <span className="midi-msg-raw">({lastMessage.note})</span>
                </span>
              </span>
              <span className="midi-msg-field">
                <span className="midi-msg-key">Vel</span>
                <span className="midi-msg-val">{lastMessage.velocity}</span>
              </span>
              <span className="midi-msg-field">
                <span className="midi-msg-key">Ch</span>
                <span className="midi-msg-val">{lastMessage.channel + 1}</span>
              </span>
            </div>
            {/* Mini velocity bar */}
            <div className="midi-vel-bar-track">
              <div
                className="midi-vel-bar-fill"
                style={{ width: `${(lastMessage.velocity / 127) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="midi-no-message">—</div>
        )}
      </div>
    </div>
  )
}
