import { useState, useCallback } from 'react'
import type { FixtureProfile, FixtureChannel, ChannelType } from '@/types/fixtures'
import { VALID_CHANNEL_TYPES } from '@/types/fixtures'

// ─────────────────────────────────────────────────────────────────────────────
// FixtureBuilder — create a fixture profile from scratch with a form.
// ─────────────────────────────────────────────────────────────────────────────

interface FixtureBuilderProps {
  onSave: (profile: FixtureProfile) => Promise<void>
}

const CHANNEL_TYPES = [...VALID_CHANNEL_TYPES] as ChannelType[]

function emptyChannel(num: number): FixtureChannel {
  return { number: num, name: '', type: 'Intensity', defaultValue: 0 }
}

export function FixtureBuilder({ onSave }: FixtureBuilderProps) {
  const [manufacturer, setManufacturer] = useState('')
  const [model,        setModel]        = useState('')
  const [mode,         setMode]         = useState('')
  const [channels,     setChannels]     = useState<FixtureChannel[]>([emptyChannel(1)])
  const [isSaving,     setIsSaving]     = useState(false)
  const [savedKey,     setSavedKey]     = useState<string | null>(null)

  // ── Channel CRUD ────────────────────────────────────────────────────────────

  const addChannel = useCallback(() => {
    setChannels(prev => [...prev, emptyChannel(prev.length + 1)])
  }, [])

  const removeChannel = useCallback((idx: number) => {
    setChannels(prev => {
      const next = prev.filter((_, i) => i !== idx)
      return next.map((ch, i) => ({ ...ch, number: i + 1 }))
    })
  }, [])

  const updateChannel = useCallback((idx: number, field: keyof FixtureChannel, value: string | number) => {
    setChannels(prev => prev.map((ch, i) =>
      i === idx ? { ...ch, [field]: value } : ch,
    ))
  }, [])

  // ── Form submit ─────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!manufacturer.trim() || !model.trim() || !mode.trim()) return
    const profile: FixtureProfile = {
      manufacturer: manufacturer.trim(),
      model:        model.trim(),
      mode:         mode.trim(),
      channels:     channels.map((ch, i) => ({ ...ch, number: i + 1 })),
    }
    setIsSaving(true)
    setSavedKey(null)
    await onSave(profile)
    setIsSaving(false)
    setSavedKey(`${profile.manufacturer} ${profile.model} (${profile.mode})`)
    // Reset form
    setManufacturer(''); setModel(''); setMode('')
    setChannels([emptyChannel(1)])
  }, [manufacturer, model, mode, channels, onSave])

  const canSave = manufacturer.trim() && model.trim() && mode.trim() &&
    channels.length > 0 &&
    channels.every(ch => ch.name.trim())

  return (
    <div className="fixture-builder">
      <div className="fb-header">
        <span className="panel-title">Fixture Builder</span>
        <span className="fb-hint">Build a profile from scratch or from a manual</span>
      </div>

      {/* Metadata */}
      <div className="fb-meta-grid">
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
            placeholder="e.g. SlimPAR Pro H"
            value={model}
            onChange={e => setModel(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Mode</label>
          <input
            className="styled-input"
            placeholder="e.g. 6-channel"
            value={mode}
            onChange={e => setMode(e.target.value)}
          />
        </div>
      </div>

      {/* Channel list header */}
      <div className="fb-channel-header">
        <span className="panel-sublabel">Channels ({channels.length})</span>
      </div>

      <div className="fb-channel-list">
        {channels.map((ch, idx) => (
          <div key={idx} className="fb-channel-row">
            {/* Channel # */}
            <span className="fb-ch-num">{ch.number}</span>

            {/* Name */}
            <input
              className="styled-input fb-ch-name"
              placeholder="Name"
              value={ch.name}
              onChange={e => updateChannel(idx, 'name', e.target.value)}
            />

            {/* Type */}
            <div className="select-wrapper fb-ch-type">
              <select
                className="styled-select"
                value={ch.type}
                onChange={e => updateChannel(idx, 'type', e.target.value as ChannelType)}
              >
                {CHANNEL_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <span className="select-arrow">▾</span>
            </div>

            {/* Default value */}
            <div className="fb-ch-default-group">
              <label className="fb-ch-default-label">Def</label>
              <input
                type="number"
                min={0} max={255}
                className="styled-input fb-ch-default"
                value={ch.defaultValue}
                onChange={e => updateChannel(idx, 'defaultValue', Math.max(0, Math.min(255, Number(e.target.value))))}
              />
            </div>

            {/* Remove */}
            {channels.length > 1 && (
              <button className="btn btn-ghost fb-ch-remove" onClick={() => removeChannel(idx)} title="Remove channel">×</button>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="fb-actions">
        <button className="btn btn-ghost" onClick={addChannel}>+ Add Channel</button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!canSave || isSaving}
        >
          {isSaving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>

      {savedKey && (
        <div className="fb-success">✓ Saved: {savedKey}</div>
      )}
    </div>
  )
}
