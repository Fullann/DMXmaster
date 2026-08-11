import { useMidiMappingStore } from '@/store/useMidiMappingStore'
import { useMidiStore } from '@/store/useMidiStore'
import { Settings2, Trash2, Crosshair, HelpCircle } from 'lucide-react'

export function MidiView() {
  const { mappings, learnMode, setLearnMode, removeMapping, clearMappings } = useMidiMappingStore()
  const midiInputs = useMidiStore(s => s.midiInputs)
  const midiStatus = useMidiStore(s => s.midiStatus)

  return (
    <div className="view-full" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
            <Settings2 size={24} /> MIDI & Controllers
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
            Map physical knobs and buttons to software actions.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: midiInputs.length > 0 ? '#10b981' : 'var(--text-muted)' }}>
            {midiInputs.length > 0 ? `Connected: ${midiInputs.map(i => i.name).join(', ')}` : 'No MIDI devices connected'}
          </span>
          <button
            onClick={() => setLearnMode(!learnMode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: learnMode ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${learnMode ? 'var(--primary-glow)' : 'rgba(255,255,255,0.1)'}`,
              color: 'white',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: 600,
              boxShadow: learnMode ? '0 0 20px var(--primary-glow)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Crosshair size={18} />
            {learnMode ? 'EXIT LEARN MODE' : 'ACTIVATE MIDI LEARN'}
          </button>
        </div>
      </div>

      {learnMode && (
        <div style={{ background: 'rgba(14, 165, 233, 0.1)', border: '1px solid #0ea5e9', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <HelpCircle size={24} color="#0ea5e9" />
          <div>
            <strong style={{ color: '#0ea5e9', display: 'block', marginBottom: '4px' }}>MIDI Learn Mode is Active</strong>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              1. Go to any tab (Grid, Show, Controls).<br/>
              2. Click on a highlighted element (it will pulse blue).<br/>
              3. Turn a knob or press a button on your physical MIDI controller.<br/>
              4. The mapping is automatically saved!
            </span>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Active Mappings ({mappings.length})</h2>
          {mappings.length > 0 && (
            <button 
              onClick={clearMappings}
              style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            >
              <Trash2 size={14} /> Clear All
            </button>
          )}
        </div>

        {mappings.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No MIDI mappings configured yet. Click "Activate MIDI Learn" to start.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Target Action</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Type</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Channel</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Note / CC</th>
                <th style={{ padding: '1rem', fontWeight: 500, width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {mappings.map(m => (
                <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{m.label}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                      {m.isCc ? 'Control Change (CC)' : 'Note On'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)' }}>CH {m.channel}</td>
                  <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)' }}>{m.noteOrCc}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button 
                      onClick={() => removeMapping(m.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      title="Remove Mapping"
                    >
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
  )
}
