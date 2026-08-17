import { useState } from 'react'
import { useFixturesStore } from '@/store/useFixturesStore'
import { Plus, Trash2, ArrowUp, ArrowDown, Save, FileBox, Copy, Edit2 } from 'lucide-react'
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

  const handleEditProfile = (p: any) => {
    setManufacturer(p.profile.manufacturer)
    setModel(p.profile.model)
    setMode(p.profile.mode)
    setChannels(p.profile.channels)
    setSuccessMsg('Profile loaded for editing.')
  }

  const handleCopyProfile = async (p: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(p.profile, null, 2))
      setSuccessMsg('Profile JSON copied to clipboard for AI!')
    } catch (err) {
      setErrorMsg('Failed to copy text.')
    }
  }

  return (
    <div className="view-full library-view">
      
      {/* ── Left Column: Builder ───────────────────────────────────────── */}
      <div className="library-builder">
        <div className="view-header">
          <FileBox size={20} color="var(--accent)" />
          <h2>Fixture Library & Builder</h2>
          <div className="view-header-actions">
            <button className="btn btn-primary" onClick={handleImportGdtf} style={{ background: '#8b5cf6', borderColor: '#7c3aed' }}>
              Import .GDTF
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              <Save size={14} /> Save Profile
            </button>
          </div>
        </div>

        {successMsg && <div className="info-banner success">{successMsg}</div>}
        {errorMsg && <div className="info-banner error">{errorMsg}</div>}

        <div className="library-builder-grid">
          {/* Info Section */}
          <div className="card">
            <div className="card-header"><span className="card-title">Profile Information</span></div>
            <div className="library-form">
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
          <div className="card">
            <div className="card-header">
              <span className="card-title">Channels ({channels.length})</span>
              <button className="btn btn-ghost btn-sm" onClick={handleAddChannel}>
                <Plus size={14} /> Add
              </button>
            </div>

            <div className="library-channels">
              {channels.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-title">No channels added</div>
                  <div className="empty-state-hint">Click Add Channel or import a GDTF file to begin.</div>
                </div>
              ) : (
                channels.map((channel, idx) => (
                  <div key={idx} className="library-ch-row">
                    
                    {/* Arrows */}
                    <div className="library-ch-arrows">
                      <button className="btn-icon-sm" disabled={idx === 0} onClick={() => handleMoveChannel(idx, -1)}>
                        <ArrowUp size={12} />
                      </button>
                      <button className="btn-icon-sm" disabled={idx === channels.length - 1} onClick={() => handleMoveChannel(idx, 1)}>
                        <ArrowDown size={12} />
                      </button>
                    </div>

                    <div className="library-ch-num">{channel.number}</div>
                    
                    <div className="library-ch-name">
                      <input 
                        className="styled-input" 
                        placeholder="Channel Name" 
                        value={channel.name} 
                        onChange={e => handleChannelUpdate(idx, { name: e.target.value })}
                      />
                    </div>

                    <div className="select-wrapper library-ch-type">
                      <select 
                        className="styled-select" 
                        value={channel.type} 
                        onChange={e => handleChannelUpdate(idx, { type: e.target.value as ChannelType })}
                      >
                        {CHANNEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span className="select-arrow">▾</span>
                    </div>

                    <div className="library-ch-def">
                      <label>Default</label>
                      <input 
                        type="number"
                        className="styled-input" 
                        value={channel.defaultValue}
                        min={0} max={255}
                        onChange={e => handleChannelUpdate(idx, { defaultValue: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <button className="btn-icon-sm danger" onClick={() => handleRemoveChannel(idx)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Column: AI Import & Profiles ─────────────────────────── */}
      <div className="library-sidebar">
        <div className="card">
          <AiImportTool onSave={saveProfile} />
        </div>
        
        <div className="card library-profiles">
          <div className="card-header">
            <span className="card-title">Saved Profiles ({profiles.length})</span>
            <button className="btn btn-ghost btn-sm" onClick={loadProfiles}>↺ Reload</button>
          </div>
          {profiles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No profiles</div>
            </div>
          ) : (
            <div className="library-profiles-list">
              {profiles.map((p: any) => (
                <div key={p.key} className="library-profile-item">
                  <div className="library-profile-info">
                    <span className="library-profile-name">{p.profile.manufacturer} {p.profile.model}</span>
                    <span className="library-profile-sub">{p.profile.mode} · {p.profile.channels.length} ch</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn-icon-sm" onClick={() => handleCopyProfile(p)} title="Copy JSON for AI">
                      <Copy size={14} />
                    </button>
                    <button className="btn-icon-sm" onClick={() => handleEditProfile(p)} title="Edit profile">
                      <Edit2 size={14} />
                    </button>
                    <button className="btn-icon-sm danger" onClick={() => deleteProfile(p.key)} title="Delete profile">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .library-view {
          display: flex;
          gap: var(--space-4);
          padding: 0 !important;
          overflow: hidden;
        }
        .library-builder {
          flex: 2;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: var(--space-4);
          overflow-y: auto;
          min-width: 0;
        }
        .library-builder-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: var(--space-4);
          align-items: start;
        }
        @media (max-width: 1100px) {
          .library-builder-grid { grid-template-columns: 1fr; }
        }
        .library-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .library-channels {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .library-ch-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          background: var(--surface-1);
          padding: var(--space-2);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }
        .library-ch-arrows {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .library-ch-num {
          width: 28px;
          font-weight: 700;
          text-align: center;
          background: var(--surface-3);
          padding: 4px;
          border-radius: var(--radius-xs);
          font-size: var(--text-sm);
        }
        .library-ch-name { flex: 1; min-width: 100px; }
        .library-ch-name input { width: 100%; }
        .library-ch-type { width: 130px; }
        .library-ch-type select { width: 100%; }
        .library-ch-def {
          width: 70px;
          display: flex;
          flex-direction: column;
        }
        .library-ch-def label {
          font-size: var(--text-2xs);
          color: var(--text-muted);
          margin-bottom: 2px;
        }
        .library-ch-def input { width: 100%; padding: 4px 8px !important; }
        
        .library-sidebar {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: var(--space-4) var(--space-4) var(--space-4) 0;
          min-width: 300px;
          max-width: 400px;
        }
        .library-profiles {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .library-profiles-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .library-profile-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-2) var(--space-3);
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
        }
        .library-profile-info {
          display: flex;
          flex-direction: column;
        }
        .library-profile-name { font-weight: 600; font-size: var(--text-sm); }
        .library-profile-sub { font-size: var(--text-xs); color: var(--text-muted); }
        
        .btn-icon-sm {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: var(--radius-xs);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-icon-sm:hover { background: var(--bg-hover); color: var(--text-primary); }
        .btn-icon-sm:disabled { opacity: 0.3; cursor: not-allowed; }
        .btn-icon-sm.danger:hover { background: rgba(255, 69, 58, 0.15); color: var(--status-error); }
        .btn-sm { padding: 4px 10px !important; font-size: var(--text-xs) !important; display: flex; align-items: center; gap: 4px; }
      `}</style>
    </div>
  )
}
