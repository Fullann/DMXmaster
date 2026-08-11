import { useState, useCallback } from 'react'
import { useScenesStore } from '@/store/useScenesStore'
import { usePaletteStore } from '@/store/usePaletteStore'
import { randomUUID } from '@/utils/uuid'
import type { Chaser, ChaserStep, ChaserStatus } from '@/types/chaser'
import type { Scene } from '@/types/scenes'
import { MidiLearnable } from '@/components/midi/MidiLearnable'
import { Plus, Square, Play, Trash2, Clapperboard, Save, ArrowUp, ArrowDown } from 'lucide-react'


// ─────────────────────────────────────────────────────────────────────────────
// ChaserEditor — Full chaser authoring panel with BPM clock + step list.
// ─────────────────────────────────────────────────────────────────────────────

interface ChaserEditorProps {
  chasers:      Chaser[]
  status:       ChaserStatus
  onSave:       (chaser: Chaser) => Promise<Chaser | null>
  onDelete:     (id: string) => Promise<void>
  onStart:      (id: string) => Promise<void>
  onStop:       () => Promise<void>
  onSetBpm:     (bpm: number) => Promise<void>
  onTapTempo:   () => Promise<void>
}

const DEFAULT_STEP: Omit<ChaserStep, 'sceneId' | 'label'> = {
  holdMs:      500,
  crossfadeMs: 0,
}

function BpmKnob({ bpm, onChange }: { bpm: number; onChange: (v: number) => void }) {
  return (
    <input
      type="range"
      min={20}
      max={300}
      step={0.5}
      value={bpm}
      className="bpm-slider"
      onChange={e => onChange(parseFloat(e.target.value))}
    />
  )
}

export function ChaserEditor({
  chasers, status,
  onSave, onDelete, onStart, onStop, onSetBpm, onTapTempo,
}: ChaserEditorProps) {
  const { scenes, loadScenes } = useScenesStore()
  const { palettes, loadPalettes } = usePaletteStore()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [editing,  setEditing]  = useState<Chaser | null>(null)
  const [newName,  setNewName]  = useState('')

  // Load or create the edited chaser
  const openChaser = useCallback((c: Chaser) => {
    setEditing(JSON.parse(JSON.stringify(c))) // deep-clone
    setActiveId(c.id)
  }, [])

  const createNew = useCallback(() => {
    const blank: Chaser = {
      id:           '',
      name:         newName.trim() || 'New Chaser',
      steps:        [],
      bpmSync:      true,
      beatsPerStep: 1,
      createdAt:    new Date().toISOString(),
    }
    setEditing(blank)
    setActiveId(null)
    setNewName('')
  }, [newName])

  const handleSave = useCallback(async () => {
    if (!editing) return
    const saved = await onSave(editing)
    if (saved) {
      setEditing(saved)
      setActiveId(saved.id)
    }
  }, [editing, onSave])

  const handleDeleteChaser = useCallback(async (id: string) => {
    await onDelete(id)
    if (activeId === id) { setEditing(null); setActiveId(null) }
  }, [activeId, onDelete])

  // ── Step management ─────────────────────────────────────────────────────────

  const addStep = useCallback((sceneId: string, label: string) => {
    if (!editing) return
    const step: ChaserStep = { sceneId, label, ...DEFAULT_STEP }
    setEditing(prev => prev ? { ...prev, steps: [...prev.steps, step] } : prev)
  }, [editing])

  const removeStep = useCallback((idx: number) => {
    setEditing(prev => prev
      ? { ...prev, steps: prev.steps.filter((_, i) => i !== idx) }
      : prev
    )
  }, [])

  const updateStep = useCallback((idx: number, patch: Partial<ChaserStep>) => {
    setEditing(prev => {
      if (!prev) return prev
      const steps = [...prev.steps]
      steps[idx] = { ...steps[idx], ...patch }
      return { ...prev, steps }
    })
  }, [])

  const moveStep = useCallback((from: number, to: number) => {
    setEditing(prev => {
      if (!prev) return prev
      const steps = [...prev.steps]
      const [item] = steps.splice(from, 1)
      steps.splice(to, 0, item)
      return { ...prev, steps }
    })
  }, [])

  const bpmMs = editing ? Math.round(60_000 / status.bpm) : 0

  return (
    <div className="chaser-editor">
      {/* ── Left Panel: Chaser List ─────────────────────────────────────── */}
      <div className="chaser-list-panel">
        <div className="panel-header">
          <span className="panel-title">Chasers</span>
        </div>

        <div className="chaser-new-row">
          <input
            className="styled-input"
            placeholder="New chaser name…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createNew()}
          />
          <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={createNew}>
            <Plus size={14} /> New
          </button>
        </div>

        <div className="chaser-list">
          {chasers.length === 0 && (
            <div className="chaser-empty">No chasers yet. Create one above.</div>
          )}
          {chasers.map(c => (
            <div
              key={c.id}
              className={`chaser-list-item ${activeId === c.id ? 'chaser-list-item--active' : ''}`}
              onClick={() => openChaser(c)}
            >
              <div className="chaser-list-info">
                <span className="chaser-list-name">{c.name}</span>
                <span className="chaser-list-sub">
                  {c.steps.length} step{c.steps.length !== 1 ? 's' : ''}
                  {c.bpmSync ? ` · ${c.beatsPerStep}b/step` : ''}
                </span>
              </div>
              <div className="chaser-list-actions">
                <MidiLearnable action={{ type: 'triggerChaser', chaserId: c.id }} label={`Toggle Chaser: ${c.name}`}>
                  {status.isRunning && status.chaserId === c.id ? (
                    <button className="btn btn-danger chaser-stop-btn" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={e => { e.stopPropagation(); onStop() }}>
                      <Square size={12} fill="currentColor" /> Stop
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary chaser-play-btn"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={e => { e.stopPropagation(); onStart(c.id) }}
                      disabled={!c.steps.length}
                    >
                      <Play size={12} fill="currentColor" />
                    </button>
                  )}
                </MidiLearnable>
                <button
                  className="btn btn-ghost"
                  style={{ color: 'var(--status-error)', fontSize: '0.8rem' }}
                  onClick={e => { e.stopPropagation(); handleDeleteChaser(c.id) }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel: Editor ──────────────────────────────────────────── */}
      <div className="chaser-edit-panel">
        {!editing ? (
          <div className="chaser-no-selection">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent)' }}>
              <Clapperboard size={48} strokeWidth={1.5} />
            </div>
            <div>Select or create a chaser to edit</div>
          </div>
        ) : (
          <>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="chaser-edit-header">
              <input
                className="styled-input chaser-name-input"
                value={editing.name}
                onChange={e => setEditing(prev => prev ? { ...prev, name: e.target.value } : prev)}
                placeholder="Chaser name"
              />
              <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleSave}>
                <Save size={14} /> Save
              </button>
            </div>

            {/* ── BPM Bar ─────────────────────────────────────────────────── */}
            <div className="bpm-bar">
              <div className="bpm-display">
                <span className="bpm-number">{status.bpm.toFixed(1)}</span>
                <span className="bpm-label">BPM</span>
                <span className="bpm-ms">({bpmMs}ms/beat)</span>
              </div>

              <BpmKnob bpm={status.bpm} onChange={onSetBpm} />

              <button
                id="btn-tap-tempo"
                className="btn btn-tap-tempo"
                onClick={onTapTempo}
              >
                TAP
              </button>

              <div className="bpm-sync-toggle">
                <label className="form-label" style={{ margin: 0 }}>BPM Sync</label>
                <button
                  className={`toggle-btn ${editing.bpmSync ? 'toggle-btn--on' : ''}`}
                  onClick={() => setEditing(prev => prev ? { ...prev, bpmSync: !prev.bpmSync } : prev)}
                >
                  {editing.bpmSync ? 'ON' : 'OFF'}
                </button>
              </div>

              {editing.bpmSync && (
                <div className="beats-per-step">
                  <label className="form-label" style={{ margin: 0 }}>Beats/Step</label>
                  <select
                    className="styled-input"
                    style={{ width: 'auto', padding: '0.3rem 0.5rem' }}
                    value={editing.beatsPerStep}
                    onChange={e => setEditing(prev => prev
                      ? { ...prev, beatsPerStep: parseFloat(e.target.value) }
                      : prev
                    )}
                  >
                    <option value={0.25}>¼</option>
                    <option value={0.5}>½</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={4}>4</option>
                    <option value={8}>8</option>
                  </select>
                </div>
              )}
            </div>

            {/* ── Playback Status ─────────────────────────────────────────── */}
            {status.isRunning && status.chaserId === editing.id && (
              <div className="chaser-running-bar">
                <div
                  className="chaser-running-progress"
                  style={{ width: `${status.stepProgress * 100}%` }}
                />
                <span className="chaser-running-label">
                  Step {status.currentStep + 1} / {status.totalSteps}
                </span>
              </div>
            )}

            {/* ── Step List ───────────────────────────────────────────────── */}
            <div className="chaser-steps-header">
              <span className="form-label">Steps ({editing.steps.length})</span>
            </div>

            <div className="chaser-steps">
              {editing.steps.length === 0 && (
                <div className="chaser-steps-empty">Add steps by choosing scenes below.</div>
              )}
              {editing.steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`chaser-step ${
                    status.isRunning && status.chaserId === editing.id && status.currentStep === idx
                      ? 'chaser-step--active'
                      : ''
                  }`}
                >
                  <div className="chaser-step-idx">{idx + 1}</div>
                  <div className="chaser-step-info">
                    <span className="chaser-step-name">{step.label || step.sceneId}</span>
                  </div>

                  {!editing.bpmSync && (
                    <div className="chaser-step-field">
                      <label>Hold (ms)</label>
                      <input
                        type="number"
                        className="styled-input chaser-step-input"
                        value={step.holdMs}
                        min={0}
                        onChange={e => updateStep(idx, { holdMs: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  )}

                  <div className="chaser-step-field">
                    <label>Fade (ms)</label>
                    <input
                      type="number"
                      className="styled-input chaser-step-input"
                      value={step.crossfadeMs}
                      min={0}
                      onChange={e => updateStep(idx, { crossfadeMs: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  
                  <div className="chaser-step-field">
                    <label>Palette</label>
                    <select
                      className="styled-input chaser-step-input"
                      value={step.paletteRefs?.[0] || ''}
                      onChange={e => updateStep(idx, { paletteRefs: e.target.value ? [e.target.value] : [] })}
                      style={{ minWidth: '100px' }}
                    >
                      <option value="">None</option>
                      {palettes.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                      ))}
                    </select>
                  </div>

                  <div className="chaser-step-move">
                    <button
                      className="btn btn-ghost"
                      disabled={idx === 0}
                      onClick={() => moveStep(idx, idx - 1)}
                      title="Move up"
                    ><ArrowUp size={14} /></button>
                    <button
                      className="btn btn-ghost"
                      disabled={idx === editing.steps.length - 1}
                      onClick={() => moveStep(idx, idx + 1)}
                      title="Move down"
                    ><ArrowDown size={14} /></button>
                  </div>

                  <button
                    className="btn btn-ghost chaser-step-remove"
                    onClick={() => removeStep(idx)}
                    title="Remove step"
                  ><Trash2 size={14} /></button>
                </div>
              ))}
            </div>

            {/* ── Scene Picker ─────────────────────────────────────────────── */}
            <div className="chaser-scene-picker">
              <div className="form-label">Add Step from Scene</div>
              <div className="chaser-scene-list">
                {scenes.length === 0 && (
                  <div className="chaser-empty">No scenes saved yet.</div>
                )}
                {scenes.map(s => (
                  <button
                    key={s.id}
                    className="chaser-scene-btn"
                    onClick={() => addStep(s.id, s.name)}
                  >
                    <span className="chaser-scene-btn-name">{s.name}</span>
                    <span className="chaser-scene-btn-mask">{s.filterMask ?? 'all'}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
