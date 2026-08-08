import { useState, useCallback } from 'react'
import type { ParameterGroup } from '@/types/scenes'
import { PARAMETER_GROUP_LABELS } from '@/types/scenes'

// ─────────────────────────────────────────────────────────────────────────────
// SceneRecorder — capture the current programmer state as a named scene,
// with parameter filter mask selection.
// ─────────────────────────────────────────────────────────────────────────────

interface SceneRecorderProps {
  onSave:  (name: string, fadeTimeMs: number, filterMask: ParameterGroup) => Promise<void>
  onClear: () => Promise<void>
}

const MASKS: ParameterGroup[] = ['all', 'color', 'position', 'intensity', 'beam']

const MASK_ICONS: Record<ParameterGroup, string> = {
  all:       '★',
  color:     '🎨',
  position:  '🧭',
  intensity: '💡',
  beam:      '⚡',
}

const MASK_TIPS: Record<ParameterGroup, string> = {
  all:       'Capture every parameter',
  color:     'RGB/W + color wheel only',
  position:  'Pan & Tilt only',
  intensity: 'Dimmer/intensity only',
  beam:      'Shutter, speed & effect only',
}

export function SceneRecorder({ onSave, onClear }: SceneRecorderProps) {
  const [name,       setName]       = useState('')
  const [fadeSecs,   setFadeSecs]   = useState('2')
  const [filterMask, setFilterMask] = useState<ParameterGroup>('all')
  const [isSaving,   setIsSaving]   = useState(false)
  const [savedMsg,   setSavedMsg]   = useState<string | null>(null)

  const handleSave = useCallback(async () => {
    if (!name.trim()) return
    setIsSaving(true)
    setSavedMsg(null)
    const fadeMs = Math.max(0, Math.round(parseFloat(fadeSecs || '0') * 1000))
    await onSave(name.trim(), fadeMs, filterMask)
    setIsSaving(false)
    setSavedMsg(`✓ Saved "${name.trim()}" [${filterMask}]`)
    setName('')
  }, [name, fadeSecs, filterMask, onSave])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
  }, [handleSave])

  return (
    <div className="scene-recorder">
      <div className="panel-header">
        <span className="panel-title">Record Scene</span>
      </div>

      {/* ── Parameter Filter Mask ─────────────────────────────────────────── */}
      <div className="form-group">
        <label className="form-label">Filter Mask</label>
        <div className="mask-pills">
          {MASKS.map(mask => (
            <button
              key={mask}
              id={`mask-btn-${mask}`}
              className={`mask-pill ${filterMask === mask ? 'mask-pill--active' : ''}`}
              onClick={() => setFilterMask(mask)}
              title={MASK_TIPS[mask]}
            >
              <span className="mask-pill-icon">{MASK_ICONS[mask]}</span>
              {PARAMETER_GROUP_LABELS[mask]}
            </button>
          ))}
        </div>
        <div className="mask-hint">{MASK_TIPS[filterMask]}</div>
      </div>

      {/* ── Scene Name ────────────────────────────────────────────────────── */}
      <div className="form-group">
        <label className="form-label">Scene Name</label>
        <input
          id="scene-name-input"
          className="styled-input"
          placeholder="e.g. Blue Night"
          value={name}
          onChange={e => { setName(e.target.value); setSavedMsg(null) }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* ── Fade Time ─────────────────────────────────────────────────────── */}
      <div className="form-group">
        <label className="form-label">Fade Time (seconds)</label>
        <input
          id="scene-fade-input"
          type="number"
          min="0"
          max="60"
          step="0.5"
          className="styled-input"
          value={fadeSecs}
          onChange={e => setFadeSecs(e.target.value)}
        />
      </div>

      <div className="scene-recorder-actions">
        <button
          id="btn-save-scene"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!name.trim() || isSaving}
        >
          {isSaving ? 'Saving…' : '● Record'}
        </button>
        <button
          id="btn-clear-programmer"
          className="btn btn-ghost btn-clear-programmer"
          onClick={onClear}
          title="Reset all fixture states to default"
        >
          ⬛ Clear
        </button>
      </div>

      {savedMsg && <div className="fb-success">{savedMsg}</div>}
    </div>
  )
}
