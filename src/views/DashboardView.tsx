import React, { useState, useMemo, useCallback } from 'react'
import { SerialConnectionPanel } from '@/components/serial/SerialConnectionPanel'
import { MidiMonitor }           from '@/components/midi/MidiMonitor'
import { ChannelSlider }         from '@/components/dmx/ChannelSlider'
import { useSerialStore }        from '@/store/useSerialStore'
import { useMidiStore }          from '@/store/useMidiStore'
import { useDmxStore }           from '@/store/useDmxStore'
import { useFixturesStore }      from '@/store/useFixturesStore'

const GenericChannel = React.memo(({ ch, onClick }: { ch: number, onClick: () => void }) => {
  const val = useDmxStore(state => state.universe[ch - 1])
  return (
    <div 
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 0',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: val > 0 ? '0 0 10px rgba(10, 132, 255, 0.2)' : 'none',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
    >
      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{ch}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: val > 0 ? 'var(--accent)' : 'var(--text-primary)' }}>{val}</span>
    </div>
  )
})

const FixtureInnerChannel = React.memo(({ ch, name, onClick }: { ch: number, name: string, onClick: () => void }) => {
  const val = useDmxStore(state => state.universe[ch - 1])
  return (
    <div 
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '4px 0',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: val > 0 ? '0 0 8px rgba(10, 132, 255, 0.3)' : 'none',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
      title={name}
    >
      <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
        {name.substring(0, 3).toUpperCase() || ch}
      </span>
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: val > 0 ? 'var(--accent)' : 'var(--text-primary)' }}>{val}</span>
    </div>
  )
})

const FixtureGroup = React.memo(({ fixture, startAddress, setActiveChannel }: any) => {
  const chCount = fixture.profile.channels.length
  return (
    <div 
      style={{
        gridColumn: `span ${Math.min(chCount, 12)}`,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        flexDirection: 'column',
        padding: '6px',
      }}
    >
      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {fixture.label} ({startAddress}-{startAddress + chCount - 1})
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${chCount}, 1fr)`, gap: '4px' }}>
        {Array.from({ length: chCount }, (_, j) => {
          const ch = startAddress + j
          return (
            <FixtureInnerChannel 
              key={ch} 
              ch={ch} 
              name={fixture.profile.channels[j]?.name || `CH ${ch}`}
              onClick={() => setActiveChannel(ch)}
            />
          )
        })}
      </div>
    </div>
  )
})

const ActiveSliderModal = React.memo(({ activeChannel, onClose }: { activeChannel: number, onClose: () => void }) => {
  const val = useDmxStore(s => s.universe[activeChannel - 1])
  const updateChannel = useDmxStore(s => s.updateChannel)
  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ transform: 'scale(1.2)' }}>
        <ChannelSlider
          channel={activeChannel}
          label={`CH ${activeChannel}`}
          externalValue={val}
          onChannelChange={updateChannel}
        />
      </div>
    </div>
  )
})

export function DashboardView() {
  const serial = useSerialStore()
  const midi = useMidiStore()
  const { engineBypassed, setEngineBypass } = useDmxStore()
  const patch = useFixturesStore(s => s.patch)
  const blackout = useDmxStore(s => s.blackout)
  
  const [activeChannel, setActiveChannel] = useState<number | null>(null)
  
  const isMidiBridgeActive = midi.lastMessage?.type === 'noteOn' || midi.lastMessage?.type === 'noteOff'

  const gridItems = useMemo(() => {
    const items = []
    let i = 1
    while (i <= 512) {
      const fixture = patch.find(f => f.startAddress === i)
      if (fixture) {
        items.push(
          <FixtureGroup 
            key={`fix-${i}`} 
            fixture={fixture} 
            startAddress={i} 
            setActiveChannel={setActiveChannel} 
          />
        )
        i += fixture.profile.channels.length
      } else {
        const ch = i
        items.push(
          <GenericChannel 
            key={ch} 
            ch={ch} 
            onClick={() => setActiveChannel(ch)} 
          />
        )
        i++
      }
    }
    return items
  }, [patch])

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
        <button id="btn-blackout" className="btn-blackout" onClick={blackout}>
          ◼ Blackout
        </button>
      </aside>

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem 0' }}>
          <div className="section-title">Universe 1 — 512 Channels</div>
          <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={engineBypassed} 
              onChange={(e) => setEngineBypass(e.target.checked)}
              style={{ accentColor: '#a855f7' }}
            />
            <span style={{ fontSize: '0.85rem', color: engineBypassed ? '#a855f7' : 'var(--text-muted)' }}>
              Bypass Smart Engine
            </span>
          </label>
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(45px, 1fr))', 
          gridAutoFlow: 'row dense',
          gap: '6px', 
          padding: '1.5rem', 
          overflowY: 'auto', 
          flex: 1, 
          alignContent: 'start' 
        }}>
          {gridItems}
        </div>
      </main>

      {/* Modal Popup for Slider */}
      {activeChannel !== null && (
        <ActiveSliderModal 
          activeChannel={activeChannel} 
          onClose={() => setActiveChannel(null)} 
        />
      )}
    </>
  )
}
