import { useState, useMemo } from 'react'
import { Plus, Save, ArrowUp, ArrowDown, Trash2, CheckCircle2 } from 'lucide-react'
import { 
  VALID_CHANNEL_TYPES, 
  getFixtureCapabilities, 
  type FixtureChannel, 
  type ChannelType,
  type PatchedFixture
} from '@/types/fixtures'
import { useFixturesStore } from '@/store/useFixturesStore'

export function FixtureBuilderView() {
  const { init } = useFixturesStore()
  
  const [manufacturer, setManufacturer] = useState('My Brand')
  const [model, setModel] = useState('New Fixture')
  const [mode, setMode] = useState('Standard')
  const [channels, setChannels] = useState<FixtureChannel[]>([
    { number: 1, name: 'Intensity', type: 'Intensity', defaultValue: 0 },
    { number: 2, name: 'Pan', type: 'Pan', defaultValue: 128 },
    { number: 3, name: 'Tilt', type: 'Tilt', defaultValue: 128 }
  ])

  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  const capabilities = useMemo(() => {
    // Mock a PatchedFixture to use the existing capability detector
    const mockFixture = {
      profile: { channels }
    } as PatchedFixture
    return getFixtureCapabilities(mockFixture)
  }, [channels])

  const handleAddChannel = () => {
    setChannels([
      ...channels,
      {
        number: channels.length + 1,
        name: 'New Channel',
        type: 'Unknown',
        defaultValue: 0
      }
    ])
  }

  const handleRemoveChannel = (index: number) => {
    const newChannels = channels.filter((_, i) => i !== index)
    // Reassign numbers
    newChannels.forEach((ch, i) => ch.number = i + 1)
    setChannels(newChannels)
  }

  const handleMoveChannel = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === channels.length - 1) return

    const newChannels = [...channels]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    
    // Swap
    const temp = newChannels[index]
    newChannels[index] = newChannels[swapIndex]
    newChannels[swapIndex] = temp

    // Reassign numbers
    newChannels.forEach((ch, i) => ch.number = i + 1)
    setChannels(newChannels)
  }

  const handleUpdateChannel = (index: number, field: keyof FixtureChannel, value: any) => {
    const newChannels = [...channels]
    newChannels[index] = { ...newChannels[index], [field]: value }
    
    // Auto-rename if type changes and name was just default or matches old type
    if (field === 'type') {
      const oldType = channels[index].type
      const oldName = channels[index].name
      if (oldName === 'New Channel' || oldName === oldType) {
        newChannels[index].name = value as string
      }
    }
    
    setChannels(newChannels)
  }

  const handleSave = async () => {
    try {
      setSaveStatus('Saving...')
      const profile = {
        manufacturer,
        model,
        mode,
        channels
      }
      
      const res = await window.fixtureAPI.saveProfile(profile)
      if (res.success) {
        setSaveStatus('Profile Saved successfully!')
        // Reload profiles in the store so the Patch view sees it
        init()
        setTimeout(() => setSaveStatus(null), 3000)
      } else {
        setSaveStatus(`Error: ${res.error}`)
      }
    } catch (e: any) {
      setSaveStatus(`Error: ${e.message}`)
    }
  }

  const channelTypesArray = Array.from(VALID_CHANNEL_TYPES)

  return (
    <div className="view-full" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Fixture Builder</h2>
          <p className="text-muted">Create custom JSON profiles for your fixtures.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {saveStatus && (
            <span style={{ color: saveStatus.includes('Error') ? 'var(--status-error)' : 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {!saveStatus.includes('Error') && <CheckCircle2 size={16} />} {saveStatus}
            </span>
          )}
          <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Save size={16} /> Save Profile
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
        
        {/* Left Column: Form & Channels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Metadata */}
          <div className="panel p-md" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Manufacturer</label>
              <input 
                className="styled-input" 
                style={{ width: '100%' }}
                value={manufacturer} 
                onChange={e => setManufacturer(e.target.value)} 
                placeholder="e.g. Chauvet"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Model</label>
              <input 
                className="styled-input" 
                style={{ width: '100%' }}
                value={model} 
                onChange={e => setModel(e.target.value)} 
                placeholder="e.g. Intimidator Spot 360"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Mode</label>
              <input 
                className="styled-input" 
                style={{ width: '100%' }}
                value={mode} 
                onChange={e => setMode(e.target.value)} 
                placeholder="e.g. 14CH"
              />
            </div>
          </div>

          {/* Channels List */}
          <div className="panel p-md" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Channels ({channels.length})</h3>
              <button className="btn btn-ghost" onClick={handleAddChannel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} /> Add Channel
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {channels.map((ch, idx) => (
                <div key={idx} style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '40px 1.5fr 1.5fr 1fr auto', 
                  gap: '1rem', 
                  alignItems: 'center',
                  background: 'var(--bg-dark)',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                    {ch.number}
                  </div>
                  
                  <input 
                    className="styled-input" 
                    value={ch.name}
                    onChange={e => handleUpdateChannel(idx, 'name', e.target.value)}
                    placeholder="Channel Name"
                  />

                  <select 
                    className="styled-input" 
                    value={ch.type}
                    onChange={e => handleUpdateChannel(idx, 'type', e.target.value as ChannelType)}
                  >
                    {channelTypesArray.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>

                  <input 
                    type="number"
                    min="0"
                    max="255"
                    className="styled-input" 
                    value={ch.defaultValue}
                    onChange={e => handleUpdateChannel(idx, 'defaultValue', parseInt(e.target.value) || 0)}
                    placeholder="Default (0-255)"
                    title="Default DMX Value (0-255)"
                  />

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-ghost" onClick={() => handleMoveChannel(idx, 'up')} disabled={idx === 0} style={{ padding: '4px' }}>
                      <ArrowUp size={16} />
                    </button>
                    <button className="btn btn-ghost" onClick={() => handleMoveChannel(idx, 'down')} disabled={idx === channels.length - 1} style={{ padding: '4px' }}>
                      <ArrowDown size={16} />
                    </button>
                    <button className="btn btn-ghost" onClick={() => handleRemoveChannel(idx)} style={{ padding: '4px', color: 'var(--status-error)' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {channels.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No channels added.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Capabilities Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="panel p-md">
            <h3 style={{ marginBottom: '1rem' }}>Computed Capabilities</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              These capabilities determine which controls will appear in the <strong>Control View</strong> for this fixture.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <CapabilityBadge active={capabilities.hasIntensity} label="Intensity Fader" />
              <CapabilityBadge active={capabilities.hasRgb} label="RGB Color Picker" />
              <CapabilityBadge active={capabilities.hasWhite} label="White Channel" />
              <CapabilityBadge active={capabilities.hasPanTilt} label="Pan / Tilt Sliders" />
              <CapabilityBadge active={capabilities.hasSmoke} label="Smoke Toggle" />
              <CapabilityBadge active={capabilities.hasGobo} label="Gobo Selector" />
              <CapabilityBadge active={capabilities.hasPrism} label="Prism Slider" />
              <CapabilityBadge active={capabilities.hasZoomFocus} label="Zoom / Focus" />
              <CapabilityBadge active={capabilities.hasEffect} label="Effect Slider" />
              <CapabilityBadge active={capabilities.hasStrobe} label="Strobe / Shutter" />
              <CapabilityBadge active={capabilities.hasColor} label="Color Wheel Slider" />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function CapabilityBadge({ active, label }: { active: boolean, label: string }) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.5rem',
      padding: '0.5rem',
      background: active ? 'rgba(46, 213, 115, 0.1)' : 'var(--bg-dark)',
      border: `1px solid ${active ? 'var(--status-success)' : 'transparent'}`,
      color: active ? 'var(--status-success)' : 'var(--text-muted)',
      borderRadius: 'var(--radius-sm)'
    }}>
      <div style={{ 
        width: '8px', 
        height: '8px', 
        borderRadius: '50%', 
        background: active ? 'var(--status-success)' : '#444' 
      }} />
      <span style={{ fontSize: '0.9rem', fontWeight: active ? 600 : 400 }}>{label}</span>
    </div>
  )
}
