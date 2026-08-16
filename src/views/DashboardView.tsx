import React, { useState, useMemo } from 'react'
import { SerialConnectionPanel } from '@/components/serial/SerialConnectionPanel'
import { MidiMonitor }           from '@/components/midi/MidiMonitor'
import { ChannelSlider }         from '@/components/dmx/ChannelSlider'
import { useSerialStore }        from '@/store/useSerialStore'
import { useMidiStore }          from '@/store/useMidiStore'
import { useDmxStore }           from '@/store/useDmxStore'
import { useFixturesStore }      from '@/store/useFixturesStore'
import { useCliStore }           from '@/store/useCliStore'
import { Cable, Server }         from 'lucide-react'

const GenericChannel = React.memo(({ ch, onClick }: { ch: number, onClick: () => void }) => {
  const val = useDmxStore(state => state.universe[ch - 1])
  return (
    <div 
      className={`dashboard-ch-generic ${val > 0 ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="dashboard-ch-num">{ch}</span>
      <span className="dashboard-ch-val">{val}</span>
    </div>
  )
})

const FixtureInnerChannel = React.memo(({ ch, name, onClick }: { ch: number, name: string, onClick: () => void }) => {
  const val = useDmxStore(state => state.universe[ch - 1])
  return (
    <div 
      className={`dashboard-ch-inner ${val > 0 ? 'active' : ''}`}
      onClick={onClick}
      title={name}
    >
      <span className="dashboard-ch-name">
        {name.substring(0, 3).toUpperCase() || ch}
      </span>
      <span className="dashboard-ch-val">{val}</span>
    </div>
  )
})

const FixtureGroup = React.memo(({ fixture, startAddress, setActiveChannel, isSelected }: any) => {
  const chCount = fixture.profile.channels.length
  return (
    <div 
      className={`dashboard-fixture-group ${isSelected ? 'selected' : ''}`}
      style={{ gridColumn: `span ${Math.min(chCount, 12)}` }}
    >
      <div className="dashboard-fixture-title">
        <span className="user-num">[{fixture.userNumber}]</span> {fixture.label} ({startAddress}-{startAddress + chCount - 1})
      </div>
      <div className="dashboard-fixture-grid" style={{ gridTemplateColumns: `repeat(${chCount}, 1fr)` }}>
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
    <div className="dashboard-modal-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="dashboard-modal">
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
  const { engineBypassed, setEngineBypass, blackout } = useDmxStore()
  const patch = useFixturesStore(s => s.patch)
  const selectedUserNumbers = useCliStore(s => s.selectedUserNumbers)
  
  const [activeChannel, setActiveChannel] = useState<number | null>(null)
  
  const isMidiBridgeActive = midi.lastMessage?.type === 'noteOn' || midi.lastMessage?.type === 'noteOff'

  const gridItems = useMemo(() => {
    const items: { type: 'fixture'; fixture: (typeof patch)[0]; startAddress: number } | { type: 'generic'; ch: number }[] = []
    let i = 1
    while (i <= 512) {
      const fixture = patch.find(f => f.startAddress === i)
      if (fixture) {
        items.push({ type: 'fixture', fixture, startAddress: i })
        i += fixture.profile.channels.length
      } else {
        items.push({ type: 'generic', ch: i })
        i++
      }
    }
    return items
  }, [patch])

  const selectedSet = useMemo(() => new Set(selectedUserNumbers), [selectedUserNumbers])

  return (
    <div className="view-full dashboard-view">
      
      {/* ── Left Sidebar (Connections) ─────────────────────────────────── */}
      <div className="dashboard-sidebar">
        <div className="card">
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
        </div>

        <div className="card">
          <MidiMonitor
            midiStatus={midi.midiStatus}
            midiInputs={midi.midiInputs}
            lastMessage={midi.lastMessage}
          />
        </div>

        {isMidiBridgeActive && (
          <div className="info-banner info">
            <span className="badge-dot pulse"></span> MIDI → CH1 bridge active
          </div>
        )}

        <button className="btn btn-danger dashboard-blackout-btn" onClick={blackout}>
          ◼ Blackout
        </button>
      </div>

      {/* ── Main Content (Universe Grid) ───────────────────────────────── */}
      <div className="dashboard-main card">
        <div className="card-header">
          <div className="card-title"><Server size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Universe 1</div>
          <div className="card-actions">
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={engineBypassed} 
                onChange={(e) => setEngineBypass(e.target.checked)}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: engineBypassed ? 'var(--status-warn)' : 'var(--text-muted)' }}>
                Bypass Smart Engine
              </span>
            </label>
          </div>
        </div>

        <div className="dashboard-grid">
          {gridItems.map(item => {
            if (item.type === 'fixture') {
              return (
                <FixtureGroup
                  key={`fix-${item.startAddress}`}
                  fixture={item.fixture}
                  startAddress={item.startAddress}
                  setActiveChannel={setActiveChannel}
                  isSelected={selectedSet.has(item.fixture.userNumber)}
                />
              )
            }
            return (
              <GenericChannel
                key={item.ch}
                ch={item.ch}
                onClick={() => setActiveChannel(item.ch)}
              />
            )
          })}
        </div>
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      {activeChannel !== null && (
        <ActiveSliderModal 
          activeChannel={activeChannel} 
          onClose={() => setActiveChannel(null)} 
        />
      )}

      <style>{`
        .dashboard-view {
          display: flex;
          gap: var(--space-4);
          height: 100%;
        }
        .dashboard-sidebar {
          width: 300px;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          flex-shrink: 0;
          overflow-y: auto;
        }
        .dashboard-blackout-btn {
          width: 100%;
          padding: var(--space-3);
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .dashboard-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
          grid-auto-flow: row dense;
          gap: 6px;
          overflow-y: auto;
          flex: 1;
          align-content: start;
        }
        
        /* Generic Channel */
        .dashboard-ch-generic {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6px 0;
          cursor: pointer;
          transition: all var(--duration-fast) ease;
        }
        .dashboard-ch-generic:hover { background: var(--bg-hover); }
        .dashboard-ch-generic.active { box-shadow: 0 0 10px rgba(10, 132, 255, 0.2); }
        .dashboard-ch-num { font-size: var(--text-2xs); color: var(--text-muted); }
        .dashboard-ch-val { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); }
        .dashboard-ch-generic.active .dashboard-ch-val { color: var(--accent); }

        /* Fixture Group */
        .dashboard-fixture-group {
          background: var(--surface-0);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          display: flex;
          flex-direction: column;
          padding: 6px;
          transition: all var(--duration-fast) ease;
        }
        .dashboard-fixture-group.selected {
          background: rgba(255, 170, 0, 0.08);
          border-color: var(--status-warn);
        }
        .dashboard-fixture-title {
          font-size: var(--text-2xs);
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dashboard-fixture-group.selected .dashboard-fixture-title { color: var(--status-warn); }
        .dashboard-fixture-title .user-num { opacity: 0.6; }
        .dashboard-fixture-grid { display: grid; gap: 4px; }

        /* Fixture Inner Channel */
        .dashboard-ch-inner {
          background: var(--surface-2);
          border-radius: var(--radius-xs);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4px 0;
          cursor: pointer;
          transition: all var(--duration-fast) ease;
        }
        .dashboard-ch-inner:hover { background: var(--surface-3); }
        .dashboard-ch-inner.active { box-shadow: 0 0 8px rgba(10, 132, 255, 0.3); }
        .dashboard-ch-name {
          font-size: 0.55rem;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .dashboard-ch-inner .dashboard-ch-val { font-size: var(--text-xs); }
        .dashboard-ch-inner.active .dashboard-ch-val { color: var(--accent); }

        /* Modal */
        .dashboard-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dashboard-modal {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  )
}
