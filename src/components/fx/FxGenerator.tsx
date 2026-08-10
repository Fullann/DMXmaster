import { useState, useEffect, useRef } from 'react'
import type { PatchedFixture } from '@/types/fixtures'
import type { FxTarget, Waveform, FxConfig, ActiveEffect } from '@/types/fx'

interface FxGeneratorProps {
  patch:         PatchedFixture[]
  activeEffects: ActiveEffect[]
  onAddEffect:   (cfg: FxConfig) => void
  onUpdateEffect: (id: string, cfg: FxConfig) => void
  onSetPaused:   (id: string, paused: boolean) => void
  onRemoveEffect: (id: string) => void
}

const WAVEFORMS: Waveform[] = ['Sine', 'Triangle', 'Sawtooth', 'Pulse']
const TARGETS: FxTarget[] = ['Intensity', 'Pan', 'Tilt', 'Red', 'Green', 'Blue', 'White', 'Color']

export function FxGenerator({ patch, activeEffects, onAddEffect, onUpdateEffect, onSetPaused, onRemoveEffect }: FxGeneratorProps) {
  // Generator State
  const [shape, setShape] = useState<Waveform>('Sine')
  const [target, setTarget] = useState<FxTarget>('Tilt')
  const [speed, setSpeed] = useState(0.5) // Hz
  const [size, setSize] = useState(128)   // 0-255 amplitude
  const [phase, setPhase] = useState(0)   // Global phase
  const [spread, setSpread] = useState(0) // Stagger per fixture
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingFxId, setEditingFxId] = useState<string | null>(null)

  // Visualizer Canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Toggle selection
  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  // Handle Select Active FX
  const handleSelectFx = (fx: ActiveEffect) => {
    setEditingFxId(fx.id)
    setShape(fx.config.shape)
    setTarget(fx.config.target)
    setSpeed(fx.config.speedHz)
    setSize(fx.config.size)
    setPhase(fx.config.phaseDegrees)
    setSpread(fx.config.spreadDegrees)
    setSelectedIds(new Set(fx.config.fixtureIds))
  }

  const handleClearSelection = () => {
    setEditingFxId(null)
  }

  // Handle Create / Update
  const handleSave = () => {
    if (selectedIds.size === 0) return
    const config: FxConfig = {
      shape,
      target,
      speedHz: speed,
      size,
      phaseDegrees: phase,
      spreadDegrees: spread,
      fixtureIds: Array.from(selectedIds)
    }
    
    if (editingFxId) {
      onUpdateEffect(editingFxId, config)
    } else {
      onAddEffect(config)
    }
  }

  // Visualizer Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    const startMs = performance.now()

    const render = () => {
      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)

      const elapsedSecs = (performance.now() - startMs) / 1000
      const fixCount = Math.max(1, selectedIds.size)

      // Draw background grid/centerline
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, height / 2)
      ctx.lineTo(width, height / 2)
      ctx.stroke()

      // Draw theoretical wave path (for the first fixture's phase)
      ctx.strokeStyle = 'rgba(124, 58, 237, 0.4)' // purple-ish
      ctx.lineWidth = 2
      ctx.beginPath()
      
      const globalPhaseRad = (phase / 360) * Math.PI * 2
      
      for (let x = 0; x <= width; x += 2) {
        // Map x to time offset: let's say width = 2 seconds of time
        const timeOffset = (x / width) * 2 
        const t = elapsedSecs + timeOffset
        const basePhase = (t * speed * Math.PI * 2) + globalPhaseRad

        let yNorm = 0
        switch (shape) {
          case 'Sine':
            yNorm = Math.sin(basePhase)
            break
          case 'Triangle':
            yNorm = 2 * Math.abs(2 * ((basePhase / (2 * Math.PI)) - Math.floor((basePhase / (2 * Math.PI)) + 0.5))) - 1
            break
          case 'Sawtooth':
            yNorm = 2 * ((basePhase / (2 * Math.PI)) - Math.floor((basePhase / (2 * Math.PI)) + 0.5))
            break
          case 'Pulse':
            yNorm = Math.sin(basePhase) >= 0 ? 1 : -1
            break
        }
        
        const y = (height / 2) - (yNorm * (size / 255) * (height / 2 - 10))
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Draw actual fixture dots at x=0
      const spreadRad = (spread / 360) * Math.PI * 2
      const arrIds = Array.from(selectedIds)

      for (let i = 0; i < arrIds.length; i++) {
        const fixturePhase = (elapsedSecs * speed * Math.PI * 2) + globalPhaseRad + (i * spreadRad)
        let yNorm = 0
        switch (shape) {
          case 'Sine': yNorm = Math.sin(fixturePhase); break
          case 'Triangle': yNorm = 2 * Math.abs(2 * ((fixturePhase / (2 * Math.PI)) - Math.floor((fixturePhase / (2 * Math.PI)) + 0.5))) - 1; break
          case 'Sawtooth': yNorm = 2 * ((fixturePhase / (2 * Math.PI)) - Math.floor((fixturePhase / (2 * Math.PI)) + 0.5)); break
          case 'Pulse': yNorm = Math.sin(fixturePhase) >= 0 ? 1 : -1; break
        }
        
        const y = (height / 2) - (yNorm * (size / 255) * (height / 2 - 10))
        const x = 20 + (i * 15) // Spread dots out slightly on x-axis so they don't completely overlap if phase spread is 0
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationFrameId)
  }, [shape, speed, size, phase, spread, selectedIds.size])


  return (
    <div className="fx-view-container">
      
      {/* ── Active Effects Sidebar ───────────────────────────────────────── */}
      <aside className="fx-sidebar">
        <div className="panel-header">
          <span className="panel-title">Active FX ({activeEffects.length})</span>
        </div>
        <div className="fx-active-list">
          {activeEffects.length === 0 ? (
            <div className="busking-empty-hint" style={{ padding: '1rem', textAlign: 'center' }}>No running effects</div>
          ) : (
            activeEffects.map(fx => (
              <div 
                key={fx.id} 
                className={`fx-active-card ${editingFxId === fx.id ? 'selected' : ''}`}
                onClick={() => handleSelectFx(fx)}
                style={{ cursor: 'pointer', border: editingFxId === fx.id ? '1px solid var(--accent)' : '' }}
              >
                <div className="fx-active-header">
                  <strong>{fx.config.shape}</strong> {fx.config.target}
                  <div>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '2px 6px', marginRight: '4px' }} 
                      onClick={(e) => { e.stopPropagation(); onSetPaused(fx.id, !fx.isPaused) }}
                    >
                      {fx.isPaused ? '▶️' : '⏸️'}
                    </button>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '2px 6px' }} 
                      onClick={(e) => { e.stopPropagation(); if(editingFxId === fx.id) handleClearSelection(); onRemoveEffect(fx.id); }}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="fx-active-meta">
                  {fx.config.speedHz}Hz · {fx.config.fixtureIds.length} fix {fx.isPaused ? '(PAUSED)' : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Generator Form ─────────────────────────────────────────────── */}
      <main className="fx-main panel">
        <div className="panel-header">
          <span className="panel-title">FX Generator {editingFxId ? '(Editing)' : ''}</span>
          {editingFxId && (
            <button className="btn btn-ghost" onClick={handleClearSelection}>Cancel Edit</button>
          )}
        </div>

        <div className="fx-generator-layout">
          
          {/* Target Selection */}
          <div className="fx-col">
            <label className="form-label">1. Select Fixtures</label>
            <div className="fx-fixture-grid">
              {patch.map(f => (
                <div 
                  key={f.id} 
                  className={`fx-fixture-btn ${selectedIds.has(f.id) ? 'selected' : ''}`}
                  onClick={() => toggleSelection(f.id)}
                >
                  <span className="fx-fixture-addr">.{f.startAddress.toString().padStart(3, '0')}</span>
                  <span className="fx-fixture-label">{f.label || f.profile.model}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <label className="form-label">2. Target Attribute</label>
              <select 
                className="styled-input" 
                value={target} 
                onChange={e => setTarget(e.target.value as FxTarget)}
              >
                {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div style={{ marginTop: '1rem' }}>
              <label className="form-label">3. Waveform</label>
              <div className="fx-shape-row">
                {WAVEFORMS.map(w => (
                  <button 
                    key={w}
                    className={`btn ${shape === w ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setShape(w)}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Parameters & Visualizer */}
          <div className="fx-col">
            <label className="form-label">4. Adjust Parameters</label>
            
            <div className="fx-slider-group">
              <div className="fx-slider-header">
                <span>Speed</span>
                <span>{speed.toFixed(2)} Hz</span>
              </div>
              <input type="range" min="0.05" max="5.0" step="0.05" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} />
            </div>

            <div className="fx-slider-group">
              <div className="fx-slider-header">
                <span>Size (Amplitude)</span>
                <span>{size}</span>
              </div>
              <input type="range" min="0" max="255" step="1" value={size} onChange={e => setSize(parseInt(e.target.value))} />
            </div>

            <div className="fx-slider-group">
              <div className="fx-slider-header">
                <span>Base Phase</span>
                <span>{phase}°</span>
              </div>
              <input type="range" min="0" max="360" step="1" value={phase} onChange={e => setPhase(parseInt(e.target.value))} />
            </div>

            <div className="fx-slider-group">
              <div className="fx-slider-header">
                <span>Spread (Stagger per Fixture)</span>
                <span>{spread}°</span>
              </div>
              <input type="range" min="0" max="360" step="1" value={spread} onChange={e => setSpread(parseInt(e.target.value))} />
            </div>

            <div className="fx-visualizer-box" style={{ marginTop: '1.5rem' }}>
              <canvas 
                ref={canvasRef} 
                width={400} 
                height={120} 
                className="fx-canvas"
              />
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}
              disabled={selectedIds.size === 0}
              onClick={handleSave}
            >
              {editingFxId ? '📝 Update Effect' : '▶ Start Effect'}
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}
