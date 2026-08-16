import { useMidiMappingStore } from '@/store/useMidiMappingStore'
import { useDmxMappingStore } from '@/store/useDmxMappingStore'
import { useMidiStore } from '@/store/useMidiStore'
import { Settings2, Trash2, Crosshair, HelpCircle, Radio } from 'lucide-react'

export function MidiView() {
  const { mappings: midiMappings, learnMode: midiLearnMode, setLearnMode: setMidiLearnMode, removeMapping: removeMidiMapping, clearMappings: clearMidiMappings } = useMidiMappingStore()
  const { mappings: dmxMappings, learnMode: dmxLearnMode, setLearnMode: setDmxLearnMode, removeMapping: removeDmxMapping, clearMappings: clearDmxMappings } = useDmxMappingStore()
  
  const midiInputs = useMidiStore(s => s.midiInputs)

  return (
    <div className="view-full midi-view">
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-left">
          <h2><Settings2 size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />External Controllers</h2>
          <p>Map physical knobs and buttons (MIDI or DMX Wing) to software actions.</p>
        </div>
        <div className="page-header-actions">
          <span className="midi-device-status">
            {midiInputs.length > 0 
              ? `✓ ${midiInputs.map(i => i.name).join(', ')}` 
              : 'No MIDI devices'}
          </span>
          <button 
            className={`btn ${midiLearnMode ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setMidiLearnMode(!midiLearnMode); setDmxLearnMode(false) }}
          >
            <Crosshair size={15} />
            {midiLearnMode ? 'EXIT MIDI LEARN' : 'MIDI LEARN'}
          </button>
          <button 
            className={`btn ${dmxLearnMode ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setDmxLearnMode(!dmxLearnMode); setMidiLearnMode(false) }}
          >
            <Radio size={15} />
            {dmxLearnMode ? 'EXIT DMX LEARN' : 'DMX-IN LEARN'}
          </button>
        </div>
      </div>

      {/* ── Learn Mode Banner ─────────────────────────────────────────── */}
      {(midiLearnMode || dmxLearnMode) && (
        <div className={`info-banner ${midiLearnMode ? 'info' : 'info'}`}>
          <HelpCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>{midiLearnMode ? 'MIDI' : 'DMX-IN'} Learn Mode Active</strong><br />
            <span className="midi-learn-steps">
              1. Go to any tab (Grid, Virtual Console).<br/>
              2. Click on a highlighted element (it will pulse blue).<br/>
              3. {midiLearnMode 
                ? 'Turn a knob or press a button on your physical MIDI controller.' 
                : 'Move a fader on your DMX-IN Wing.'}<br/>
              4. The mapping is automatically saved!
            </span>
          </div>
        </div>
      )}

      {/* ── Tables ────────────────────────────────────────────────────── */}
      <div className="midi-tables">
        {/* MIDI Mappings */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Settings2 size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> MIDI Mappings ({midiMappings.length})</span>
            {midiMappings.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={clearMidiMappings}>
                <Trash2 size={13} /> Clear
              </button>
            )}
          </div>
          
          {midiMappings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No MIDI mappings</div>
              <div className="empty-state-hint">Use MIDI Learn to map physical controls.</div>
            </div>
          ) : (
            <div className="midi-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Target Action</th>
                    <th>Type</th>
                    <th>Channel</th>
                    <th>Note / CC</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {midiMappings.map(m => (
                    <tr key={m.id}>
                      <td>{m.label}</td>
                      <td><span className="midi-type-badge">{m.isCc ? 'CC' : 'Note'}</span></td>
                      <td className="mono">CH {m.channel}</td>
                      <td className="mono">{m.noteOrCc}</td>
                      <td>
                        <button className="btn-icon-sm" onClick={() => removeMidiMapping(m.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DMX-IN Mappings */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Radio size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> DMX-IN Mappings ({dmxMappings.length})</span>
            {dmxMappings.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={clearDmxMappings}>
                <Trash2 size={13} /> Clear
              </button>
            )}
          </div>
          
          {dmxMappings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No DMX-IN mappings</div>
              <div className="empty-state-hint">Use DMX-IN Learn to map faders from a wing.</div>
            </div>
          ) : (
            <div className="midi-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Target Action</th>
                    <th>Universe</th>
                    <th>Channel</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dmxMappings.map(m => (
                    <tr key={m.id}>
                      <td>{m.label}</td>
                      <td className="mono">Univ {m.universe + 1}</td>
                      <td className="mono">CH {m.channel + 1}</td>
                      <td>
                        <button className="btn-icon-sm" onClick={() => removeDmxMapping(m.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .midi-view {
          flex-direction: column !important;
          overflow-y: auto !important;
          gap: var(--space-4) !important;
        }
        .midi-device-status {
          font-size: var(--text-xs);
          color: var(--text-muted);
          padding: 4px 10px;
          background: var(--surface-2);
          border-radius: var(--radius-full);
          border: 1px solid var(--border);
        }
        .midi-learn-steps {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          line-height: 1.7;
        }
        .midi-tables {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
          flex: 1;
          min-height: 0;
        }
        .midi-table-wrap {
          overflow-y: auto;
          max-height: 400px;
        }
        .midi-type-badge {
          background: var(--surface-3);
          padding: 2px 8px;
          border-radius: var(--radius-xs);
          font-size: var(--text-xs);
          font-weight: 600;
        }
        .mono {
          font-family: var(--font-mono);
        }
        .btn-icon-sm {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: var(--radius-xs);
          transition: all var(--duration-fast) ease;
          display: flex;
          align-items: center;
        }
        .btn-icon-sm:hover {
          background: rgba(255, 69, 58, 0.15);
          color: var(--status-error);
        }
        .btn-sm {
          padding: 4px 10px !important;
          font-size: var(--text-xs) !important;
          display: flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>
    </div>
  )
}
