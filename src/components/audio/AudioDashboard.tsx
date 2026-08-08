import { useState, useEffect, useCallback } from 'react'
import type { AudioBand, AudioTrigger } from '@/types/audio'
import type { PatchedFixture, ChannelType } from '@/types/fixtures'
import type { ActiveEffect } from '@/types/fx'
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer'

interface AudioDashboardProps {
  patch: PatchedFixture[]
  effects: ActiveEffect[]
}

const BANDS: AudioBand[] = ['lows', 'mids', 'highs']
const CHANNELS: ChannelType[] = ['Intensity', 'Red', 'Green', 'Blue', 'White', 'Color', 'Pan', 'Tilt', 'Effect', 'Speed', 'Smoke']

export function AudioDashboard({ patch, effects }: AudioDashboardProps) {
  const audio = useAudioAnalyzer()
  
  // Triggers state
  const [triggers, setTriggers] = useState<AudioTrigger[]>([])
  
  // Form state
  const [formBand, setFormBand] = useState<AudioBand>('lows')
  const [formType, setFormType] = useState<'fixture' | 'fx'>('fixture')
  const [formFixIds, setFormFixIds] = useState<Set<string>>(new Set())
  const [formChannel, setFormChannel] = useState<ChannelType>('Intensity')
  const [formFxId, setFormFxId] = useState<string>('')
  const [formFxParam, setFormFxParam] = useState<'speed' | 'size'>('speed')
  const [formMin, setFormMin] = useState(0)
  const [formMax, setFormMax] = useState(255)

  // ── IPC Sync ──────────────────────────────────────────────────────────────
  
  const loadTriggers = useCallback(async () => {
    const res = await window.audioAPI.getTriggers()
    if (res.success && res.triggers) setTriggers(res.triggers)
  }, [])

  useEffect(() => {
    loadTriggers()
  }, [loadTriggers])

  const handleAddTrigger = async () => {
    const newTrigger: Omit<AudioTrigger, 'id'> = {
      band: formBand,
      targetType: formType,
      minVal: formMin,
      maxVal: formMax
    }

    if (formType === 'fixture') {
      if (formFixIds.size === 0) return
      newTrigger.fixtureIds = Array.from(formFixIds)
      newTrigger.channelType = formChannel
    } else {
      if (!formFxId) return
      newTrigger.fxId = formFxId
      newTrigger.fxParam = formFxParam
    }

    await window.audioAPI.addTrigger(newTrigger)
    loadTriggers()
  }

  const handleRemoveTrigger = async (id: string) => {
    await window.audioAPI.removeTrigger(id)
    loadTriggers()
  }

  const toggleFix = (id: string) => {
    setFormFixIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="audio-dashboard">
      
      {/* ── Left Column: Audio Source & Visualizer ─────────────────────────── */}
      <div className="audio-col panel">
        <div className="panel-header">
          <span className="panel-title">Audio Input</span>
        </div>
        
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <select 
            className="styled-input" 
            value={audio.selectedDeviceId} 
            onChange={e => audio.setSelectedDeviceId(e.target.value)}
            disabled={audio.isListening}
          >
            {audio.devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
            ))}
          </select>
          
          <button 
            className={`btn ${audio.isListening ? 'btn-danger' : 'btn-primary'}`} 
            style={{ width: '100%', marginTop: '0.5rem' }}
            onClick={audio.isListening ? audio.stopListening : audio.startListening}
          >
            {audio.isListening ? '■ Stop Engine' : '▶ Start Engine'}
          </button>
        </div>

        <div className="audio-visualizer">
          <div className="eq-band">
            <div className="eq-bar-wrap">
              <div className="eq-bar lows" style={{ height: `${(audio.bands.lows / 255) * 100}%` }} />
            </div>
            <span className="eq-label">BASS</span>
          </div>
          <div className="eq-band">
            <div className="eq-bar-wrap">
              <div className="eq-bar mids" style={{ height: `${(audio.bands.mids / 255) * 100}%` }} />
            </div>
            <span className="eq-label">MIDS</span>
          </div>
          <div className="eq-band">
            <div className="eq-bar-wrap">
              <div className="eq-bar highs" style={{ height: `${(audio.bands.highs / 255) * 100}%` }} />
            </div>
            <span className="eq-label">HIGHS</span>
          </div>
        </div>
      </div>

      {/* ── Center Column: Assignment Form ───────────────────────────────── */}
      <div className="audio-col panel">
        <div className="panel-header">
          <span className="panel-title">Add Trigger Mapping</span>
        </div>
        
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label">Listen to Band</label>
          <div className="fx-shape-row">
            {BANDS.map(b => (
              <button 
                key={b} 
                className={`btn ${formBand === b ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFormBand(b)}
              >
                {b.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Target Type</label>
          <div className="fx-shape-row">
            <button className={`btn ${formType === 'fixture' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFormType('fixture')}>Fixture Attribute</button>
            <button className={`btn ${formType === 'fx' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFormType('fx')}>Effect Parameter</button>
          </div>
        </div>

        {formType === 'fixture' ? (
          <>
            <div className="form-group">
              <label className="form-label">Select Fixtures</label>
              <div className="fx-fixture-grid">
                {patch.map(f => (
                  <div 
                    key={f.id} 
                    className={`fx-fixture-btn ${formFixIds.has(f.id) ? 'selected' : ''}`}
                    onClick={() => toggleFix(f.id)}
                  >
                    {f.label || f.profile.model}
                  </div>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Attribute</label>
              <select className="styled-input" value={formChannel} onChange={e => setFormChannel(e.target.value as ChannelType)}>
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Active Effect</label>
              <select className="styled-input" value={formFxId} onChange={e => setFormFxId(e.target.value)}>
                <option value="" disabled>-- Select Effect --</option>
                {effects.map(fx => <option key={fx.id} value={fx.id}>{fx.config.shape} on {fx.config.target}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Parameter to Modulate</label>
              <select className="styled-input" value={formFxParam} onChange={e => setFormFxParam(e.target.value as 'speed'|'size')}>
                <option value="speed">Speed (Hz)</option>
                <option value="size">Size (Amplitude)</option>
              </select>
            </div>
          </>
        )}

        <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Min Val</label>
            <input type="number" className="styled-input" value={formMin} onChange={e => setFormMin(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Max Val</label>
            <input type="number" className="styled-input" value={formMax} onChange={e => setFormMax(Number(e.target.value))} />
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleAddTrigger}>
          Add Mapping
        </button>
      </div>

      {/* ── Right Column: Active Triggers ────────────────────────────────── */}
      <div className="audio-col panel">
        <div className="panel-header">
          <span className="panel-title">Active Mappings ({triggers.length})</span>
        </div>
        <div className="fx-active-list" style={{ marginTop: '0.5rem' }}>
          {triggers.length === 0 ? (
            <div className="busking-empty-hint" style={{ textAlign: 'center', padding: '2rem 0' }}>No active audio mappings</div>
          ) : (
            triggers.map(t => (
              <div key={t.id} className="fx-active-card">
                <div className="fx-active-header">
                  <strong>{t.band.toUpperCase()}</strong>
                  <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => handleRemoveTrigger(t.id)}>×</button>
                </div>
                <div className="fx-active-meta">
                  {t.targetType === 'fixture' 
                    ? `Modulates ${t.fixtureIds?.length} fix (${t.channelType})`
                    : `Modulates FX (${t.fxParam})`}
                </div>
                <div className="fx-active-meta" style={{ marginTop: '4px' }}>
                  Range: [{t.minVal} - {t.maxVal}]
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
    </div>
  )
}
