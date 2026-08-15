import { useState } from 'react'
import { useFixturesStore } from '@/store/useFixturesStore'
import { Plus, Trash2, ArrowUp, ArrowDown, Save } from 'lucide-react'
import type { FixtureProfile, FixtureChannel, ChannelType } from '@/types/fixtures'
import { AiImportTool } from '@/components/fixtures/AiImportTool'

const CHANNEL_TYPES: ChannelType[] = [
  'Intensity', 'Red', 'Green', 'Blue', 'White', 'Color',
  'Pan', 'Tilt', 'Smoke', 'Shutter', 'Strobe',
  'Speed', 'Effect', 'Gobo', 'Prism', 'Zoom', 'Focus', 'Unknown'
]

export function LibraryView() {
  const { saveProfile, loadProfiles, profiles, deleteProfile } = useFixturesStore()
  
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [mode, setMode] = useState('')
  const [channels, setChannels] = useState<FixtureChannel[]>([])
  
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleAddChannel = () => {
    setChannels([
      ...channels,
      {
        number: channels.length + 1,
        name: `Channel ${channels.length + 1}`,
        type: 'Intensity',
        defaultValue: 0
      }
    ])
  }

  const handleRemoveChannel = (index: number) => {
    const newChannels = channels.filter((_, i) => i !== index)
    // Re-number
    setChannels(newChannels.map((c, i) => ({ ...c, number: i + 1 })))
  }

  const handleMoveChannel = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= channels.length) return
    const newChannels = [...channels]
    const temp = newChannels[index]
    newChannels[index] = newChannels[index + direction]
    newChannels[index + direction] = temp
    // Re-number
    setChannels(newChannels.map((c, i) => ({ ...c, number: i + 1 })))
  }

  const handleChannelUpdate = (index: number, updates: Partial<FixtureChannel>) => {
    const newChannels = [...channels]
    newChannels[index] = { ...newChannels[index], ...updates }
    setChannels(newChannels)
  }

  const handleSave = async () => {
    setSuccessMsg('')
    setErrorMsg('')
    
    if (!manufacturer.trim() || !model.trim() || !mode.trim()) {
      setErrorMsg('Manufacturer, Model, and Mode are required.')
      return
    }
    
    if (channels.length === 0) {
      setErrorMsg('You must add at least one channel.')
      return
    }

    setIsSaving(true)
    
    const profile: FixtureProfile = {
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      mode: mode.trim(),
      channels: channels
    }

    const key = await saveProfile(profile)
    setIsSaving(false)
    
    if (key) {
      setSuccessMsg(`Profile "${key}" saved successfully!`)
      setManufacturer('')
      setModel('')
      setMode('')
      setChannels([])
      await loadProfiles() // Refresh patch list
    } else {
      setErrorMsg('Failed to save profile.')
    }
  }

  const handleImportGdtf = async () => {
    setSuccessMsg('')
    setErrorMsg('')
    const res = await (window as any).fixtureAPI.importGdtf()
    if (!res.success) {
      if (res.error !== 'Canceled') setErrorMsg(res.error || 'Failed to import GDTF.')
      return
    }
    if (res.profile) {
      setManufacturer(res.profile.manufacturer)
      setModel(res.profile.model)
      setMode(res.profile.mode)
      setChannels(res.profile.channels)
      setSuccessMsg('GDTF imported successfully! Review and click Save.')
    }
  }

  return (
    <div className="view-full" style={{ padding: '1.5rem', display: 'flex', gap: '2rem', overflowY: 'auto' }}>
      
      {/* Left Column: Builder */}
      <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: '0' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Fixture Library & Builder</h2>
            <p className="text-muted">Create custom DMX fixture profiles or import them. Saved profiles are instantly available in Patch.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={handleImportGdtf}
              style={{ 
                background: '#8b5cf6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-md)', 
                cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              Import .GDTF
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave} 
              disabled={isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Save size={16} /> Save Profile
            </button>
          </div>
        </header>

        {successMsg && <div style={{ color: 'var(--status-ok)', background: 'rgba(52, 211, 153, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>{successMsg}</div>}
        {errorMsg && <div style={{ color: 'var(--status-error)', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>{errorMsg}</div>}

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Info Section */}
          <div style={{ flex: '1', minWidth: '250px', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: '1rem' }}>Profile Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Manufacturer</label>
                <input 
                  className="styled-input" 
                  placeholder="e.g. Chauvet" 
                  value={manufacturer}
                  onChange={e => setManufacturer(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Model</label>
                <input 
                  className="styled-input" 
                  placeholder="e.g. Intimidator Spot 360" 
                  value={model}
                  onChange={e => setModel(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mode Name</label>
                <input 
                  className="styled-input" 
                  placeholder="e.g. 14-channel, Standard" 
                  value={mode}
                  onChange={e => setMode(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Channels Section */}
          <div style={{ flex: '2', minWidth: '400px', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Channels ({channels.length})</h3>
              <button className="btn btn-ghost" onClick={handleAddChannel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-panel)' }}>
                <Plus size={16} /> Add Channel
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {channels.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                  No channels added yet.
                </div>
              ) : (
                channels.map((channel, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-panel)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                    
                    {/* Arrows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <button className="btn btn-ghost" style={{ padding: '0.2rem' }} disabled={idx === 0} onClick={() => handleMoveChannel(idx, -1)}>
                        <ArrowUp size={14} />
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '0.2rem' }} disabled={idx === channels.length - 1} onClick={() => handleMoveChannel(idx, 1)}>
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    <div style={{ width: '30px', fontWeight: 'bold', textAlign: 'center', background: 'var(--bg-base)', padding: '0.25rem', borderRadius: '4px' }}>
                      {channel.number}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <input 
                        className="styled-input" 
                        placeholder="Channel Name" 
                        value={channel.name} 
                        onChange={e => handleChannelUpdate(idx, { name: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div className="select-wrapper" style={{ width: '120px' }}>
                      <select 
                        className="styled-select" 
                        value={channel.type} 
                        onChange={e => handleChannelUpdate(idx, { type: e.target.value as ChannelType })}
                        style={{ width: '100%' }}
                      >
                        {CHANNEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span className="select-arrow">▾</span>
                    </div>

                    <div style={{ width: '80px', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Default</span>
                      <input 
                        type="number"
                        className="styled-input" 
                        value={channel.defaultValue}
                        min={0} max={255}
                        onChange={e => handleChannelUpdate(idx, { defaultValue: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <button className="btn btn-ghost" style={{ color: 'var(--status-error)' }} onClick={() => handleRemoveChannel(idx)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: AI Import & Profiles */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: '300px', maxWidth: '400px' }}>
        <div className="panel">
          <AiImportTool onSave={saveProfile} />
        </div>
        
        <div className="panel profile-list-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-header">
            <span className="panel-title">Saved Profiles ({profiles.length})</span>
            <button className="btn btn-ghost" style={{ fontSize: '0.75rem' }} onClick={loadProfiles}>↺ Reload</button>
          </div>
          {profiles.length === 0 ? (
            <div className="patch-empty">No profiles saved yet.</div>
          ) : (
            <div className="profile-list" style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              {profiles.map((p: any) => (
                <div key={p.key} className="profile-list-item" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '0.5rem'
                }}>
                  <div className="profile-list-info" style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="profile-list-name" style={{ fontWeight: 600 }}>{p.profile.manufacturer} {p.profile.model}</span>
                    <span className="profile-list-sub" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.profile.mode} · {p.profile.channels.length} ch</span>
                  </div>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: '0.7rem', color: 'var(--status-error)', padding: '0.4rem' }}
                    onClick={() => deleteProfile(p.key)}
                    title="Delete profile"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
    </div>
  )
}
