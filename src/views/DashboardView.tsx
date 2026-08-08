import { SerialConnectionPanel } from '@/components/serial/SerialConnectionPanel'
import { MidiMonitor }           from '@/components/midi/MidiMonitor'
import { ChannelSlider }         from '@/components/dmx/ChannelSlider'
import { useSerialStore }        from '@/store/useSerialStore'
import { useMidiStore }          from '@/store/useMidiStore'
import { useDmxStore }           from '@/store/useDmxStore'

const VISIBLE_CHANNELS = 4
const CHANNEL_LABELS: Record<number, string> = {
  1: 'Channel 1', 2: 'Channel 2', 3: 'Channel 3', 4: 'Channel 4',
}

export function DashboardView() {
  const serial = useSerialStore()
  const midi = useMidiStore()
  const dmx = useDmxStore()
  
  const isMidiBridgeActive = midi.lastMessage?.type === 'noteOn' || midi.lastMessage?.type === 'noteOff'

  return (
    <>
      <aside className="sidebar">
        <SerialConnectionPanel
          ports={serial.ports}
          selectedPort={serial.selectedPort}
          isConnected={serial.isConnected}
          isLoading={serial.isLoading}
          error={serial.error}
          onPortSelect={serial.setSelectedPort}
          onConnect={() => serial.connect(serial.selectedPort)}
          onDisconnect={serial.disconnect}
          onRefresh={serial.listPorts}
        />
        <MidiMonitor
          midiStatus={midi.midiStatus}
          midiInputs={midi.midiInputs}
          lastMessage={midi.lastMessage}
        />
        <div className="midi-bridge-info">
          <span className={`midi-bridge-dot ${isMidiBridgeActive ? 'active' : ''}`} />
          MIDI → CH1 bridge active
        </div>
        <button id="btn-blackout" className="btn-blackout" onClick={dmx.blackout}>
          ◼ Blackout
        </button>
      </aside>

      <main className="main-content">
        <div className="sliders-section">
          <div className="section-title">Universe 1 — Raw Channels</div>
          <div className="sliders-row">
            {Array.from({ length: VISIBLE_CHANNELS }, (_, i) => {
              const ch = i + 1
              return (
                <ChannelSlider
                  key={ch}
                  channel={ch}
                  label={CHANNEL_LABELS[ch]}
                  externalValue={dmx.universe[ch - 1]}
                  onChannelChange={dmx.updateChannel}
                />
              )
            })}
          </div>
        </div>
      </main>
    </>
  )
}
