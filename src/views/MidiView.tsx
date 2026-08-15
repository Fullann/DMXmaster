import { useMidiMappingStore } from '@/store/useMidiMappingStore'
import { useDmxMappingStore } from '@/store/useDmxMappingStore'
import { useMidiStore } from '@/store/useMidiStore'
import { Settings2, Trash2, Crosshair, HelpCircle, Radio } from 'lucide-react'

export function MidiView() {
  const { mappings: midiMappings, learnMode: midiLearnMode, setLearnMode: setMidiLearnMode, removeMapping: removeMidiMapping, clearMappings: clearMidiMappings } = useMidiMappingStore()
  const { mappings: dmxMappings, learnMode: dmxLearnMode, setLearnMode: setDmxLearnMode, removeMapping: removeDmxMapping, clearMappings: clearDmxMappings } = useDmxMappingStore()
  
  const midiInputs = useMidiStore(s => s.midiInputs)
  const midiStatus = useMidiStore(s => s.midiStatus)

  return (
    <div className="view-full" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
            <Settings2 size={24} /> External Controllers (MIDI & DMX)
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
            Map physical knobs and buttons (MIDI or DMX Wing) to software actions.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: midiInputs.length > 0 ? '#10b981' : 'var(--text-muted)' }}>
            {midiInputs.length > 0 ? `MIDI Connected: ${midiInputs.map(i => i.name).join(', ')}` : 'No MIDI devices connected'}
          </span>
          
          <button
            onClick={() => { setMidiLearnMode(!midiLearnMode); setDmxLearnMode(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: midiLearnMode ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${midiLearnMode ? 'var(--primary-glow)' : 'rgba(255,255,255,0.1)'}`,
              color: 'white', padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600,
              boxShadow: midiLearnMode ? '0 0 20px var(--primary-glow)' : 'none', transition: 'all 0.2s ease',
            }}
          >
            <Crosshair size={18} />
            {midiLearnMode ? 'EXIT MIDI LEARN' : 'MIDI LEARN'}
          </button>
          
          <button
            onClick={() => { setDmxLearnMode(!dmxLearnMode); setMidiLearnMode(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: dmxLearnMode ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${dmxLearnMode ? '#a78bfa' : 'rgba(255,255,255,0.1)'}`,
              color: 'white', padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600,
              boxShadow: dmxLearnMode ? '0 0 20px rgba(139, 92, 246, 0.5)' : 'none', transition: 'all 0.2s ease',
            }}
          >
            <Radio size={18} />
            {dmxLearnMode ? 'EXIT DMX LEARN' : 'DMX-IN LEARN'}
          </button>
        </div>
      </div>

      {(midiLearnMode || dmxLearnMode) && (
        <div style={{ background: midiLearnMode ? 'rgba(14, 165, 233, 0.1)' : 'rgba(139, 92, 246, 0.1)', border: `1px solid ${midiLearnMode ? '#0ea5e9' : '#8b5cf6'}`, padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <HelpCircle size={24} color={midiLearnMode ? '#0ea5e9' : '#8b5cf6'} />
          <div>
            <strong style={{ color: midiLearnMode ? '#0ea5e9' : '#8b5cf6', display: 'block', marginBottom: '4px' }}>
              {midiLearnMode ? 'MIDI' : 'DMX-IN'} Learn Mode is Active
            </strong>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              1. Go to any tab (Grid, Virtual Console).<br/>
              2. Click on a highlighted element (it will pulse blue).<br/>
              3. {midiLearnMode ? 'Turn a knob or press a button on your physical MIDI controller.' : 'Move a fader on your DMX-IN Wing (Universe must be set to "Remote Control" in Network Setup).'}<br/>
              4. The mapping is automatically saved!
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1, minHeight: 0 }}>
        
        {/* ── MIDI MAPPINGS ────────────────────────────────────────────── */}
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings2 size={16} /> MIDI Mappings ({midiMappings.length})</h2>
            {midiMappings.length > 0 && (
              <button onClick={clearMidiMappings} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <Trash2 size={14} /> Clear
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {midiMappings.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No MIDI mappings configured.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem', fontWeight: 500 }}>Target Action</th>
                    <th style={{ padding: '0.75rem', fontWeight: 500 }}>Type</th>
                    <th style={{ padding: '0.75rem', fontWeight: 500 }}>Channel</th>
                    <th style={{ padding: '0.75rem', fontWeight: 500 }}>Note / CC</th>
                    <th style={{ padding: '0.75rem', fontWeight: 500, width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {midiMappings.map(m => (
                    <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{m.label}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                          {m.isCc ? 'CC' : 'Note'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>CH {m.channel}</td>
                      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>{m.noteOrCc}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button onClick={() => removeMidiMapping(m.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── DMX-IN MAPPINGS ────────────────────────────────────────────── */}
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Radio size={16} /> DMX-IN Mappings ({dmxMappings.length})</h2>
            {dmxMappings.length > 0 && (
              <button onClick={clearDmxMappings} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <Trash2 size={14} /> Clear
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {dmxMappings.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No DMX-IN mappings configured.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem', fontWeight: 500 }}>Target Action</th>
                    <th style={{ padding: '0.75rem', fontWeight: 500 }}>Universe</th>
                    <th style={{ padding: '0.75rem', fontWeight: 500 }}>Channel</th>
                    <th style={{ padding: '0.75rem', fontWeight: 500, width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {dmxMappings.map(m => (
                    <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{m.label}</td>
                      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>Univ {m.universe + 1}</td>
                      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>CH {m.channel + 1}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button onClick={() => removeDmxMapping(m.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
