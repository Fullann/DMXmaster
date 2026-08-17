import { useState, useEffect, useRef } from 'react'
import type { PatchedFixture } from '@/types/fixtures'
import type { FxTarget, Waveform, FxConfig, ActiveEffect } from '@/types/fx'
import { Play, Pause, Trash2, Edit3, PlayCircle } from 'lucide-react'

interface FxGeneratorProps {
  patch:         PatchedFixture[]
  activeEffects: ActiveEffect[]
  onAddEffect:   (cfg: FxConfig) => void
  onUpdateEffect: (id: string, cfg: FxConfig) => void
  onSetPaused:   (id: string, paused: boolean) => void
  onRemoveEffect: (id: string) => void
}

const WAVEFORMS: Waveform[] = ['Sine', 'Triangle', 'Sawtooth', 'Pulse', 'Circle', 'Figure8', 'Rainbow', 'Random']
const TARGETS: FxTarget[] = ['Intensity', 'Position', 'Pan', 'Tilt', 'Color', 'Red', 'Green', 'Blue', 'White']

export function FxGenerator({ patch, activeEffects, onAddEffect, onUpdateEffect, onSetPaused, onRemoveEffect }: FxGeneratorProps) {
  // Generator State
  const [shape, setShape] = useState<Waveform>('Sine')
  const [target, setTarget] = useState<FxTarget>('Tilt')
  const [speed, setSpeed] = useState(0.5) // Hz
  const [size, setSize] = useState(128)   // 0-255 amplitude (1D)
  const [sizeX, setSizeX] = useState(128) // 0-255 amplitude X
  const [sizeY, setSizeY] = useState(128) // 0-255 amplitude Y
  const [rotation, setRotation] = useState(0) // 0-360 degrees
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
    setSizeX(fx.config.sizeX ?? fx.config.size)
    setSizeY(fx.config.sizeY ?? fx.config.size)
    setRotation(fx.config.rotationDegrees ?? 0)
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
      sizeX: target === 'Position' ? sizeX : undefined,
      sizeY: target === 'Position' ? sizeY : undefined,
      rotationDegrees: target === 'Position' ? rotation : undefined,
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
      if (target === 'Position') {
        ctx.moveTo(width / 2, 0)
        ctx.lineTo(width / 2, height)
      }
      ctx.stroke()
      
      const globalPhaseRad = (phase / 360) * Math.PI * 2
      const spreadRad = (spread / 360) * Math.PI * 2
      const arrIds = Array.from(selectedIds)

      if (target === 'Position') {
        // ── 2D SPATIAL PLOT (Pan / Tilt) ──
        ctx.strokeStyle = 'rgba(124, 58, 237, 0.4)'
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let i = 0; i <= 100; i++) {
          const tPhase = (i / 100) * Math.PI * 2
          let xNorm = 0, yNorm = 0
          switch (shape) {
            case 'Circle': xNorm = Math.sin(tPhase); yNorm = Math.cos(tPhase); break
            case 'Figure8': xNorm = Math.sin(tPhase); yNorm = Math.sin(tPhase * 2); break
            case 'Random': 
              xNorm = (Math.sin(tPhase * 1.5) + Math.cos(tPhase * 2.3) + Math.sin(tPhase * 4.1)) / 3
              yNorm = (Math.cos(tPhase * 1.7) + Math.sin(tPhase * 2.1) + Math.cos(tPhase * 3.9)) / 3
              break
            default: xNorm = Math.sin(tPhase); yNorm = xNorm; break
          }
          const sx = xNorm * (sizeX / 255) * (height / 2 - 10)
          const sy = yNorm * (sizeY / 255) * (height / 2 - 10)
          const rotRad = (rotation / 360) * Math.PI * 2
          const rotX = sx * Math.cos(rotRad) - sy * Math.sin(rotRad)
          const rotY = sx * Math.sin(rotRad) + sy * Math.cos(rotRad)
          
          const px = (width / 2) + rotX
          const py = (height / 2) - rotY
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()

        // Draw fixtures on the 2D path
        for (let i = 0; i < arrIds.length; i++) {
          const fixturePhase = (elapsedSecs * speed * Math.PI * 2) + globalPhaseRad + (i * spreadRad)
          let xNorm = 0, yNorm = 0
          switch (shape) {
            case 'Circle': xNorm = Math.sin(fixturePhase); yNorm = Math.cos(fixturePhase); break
            case 'Figure8': xNorm = Math.sin(fixturePhase); yNorm = Math.sin(fixturePhase * 2); break
            case 'Random': 
              xNorm = (Math.sin(fixturePhase * 1.5) + Math.cos(fixturePhase * 2.3) + Math.sin(fixturePhase * 4.1)) / 3
              yNorm = (Math.cos(fixturePhase * 1.7) + Math.sin(fixturePhase * 2.1) + Math.cos(fixturePhase * 3.9)) / 3
              break
            default: xNorm = Math.sin(fixturePhase); yNorm = xNorm; break
          }
          const sx = xNorm * (sizeX / 255) * (height / 2 - 10)
          const sy = yNorm * (sizeY / 255) * (height / 2 - 10)
          const rotRad = (rotation / 360) * Math.PI * 2
          const rotX = sx * Math.cos(rotRad) - sy * Math.sin(rotRad)
          const rotY = sx * Math.sin(rotRad) + sy * Math.cos(rotRad)
          
          const px = (width / 2) + rotX
          const py = (height / 2) - rotY

          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
          ctx.beginPath()
          ctx.arc(px, py, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#000'
          ctx.lineWidth = 1
          ctx.stroke()
        }

      } else {
        // ── 1D TIME PLOT (Amplitude over time) ──
        const isRainbow = shape === 'Rainbow'
        const curvesToDraw = isRainbow ? 3 : 1
        const colors = isRainbow 
          ? ['rgba(255, 59, 48, 0.6)', 'rgba(52, 199, 89, 0.6)', 'rgba(0, 122, 255, 0.6)'] // R, G, B
          : ['rgba(124, 58, 237, 0.4)']
        const phaseOffsets = isRainbow ? [0, Math.PI * 2 / 3, Math.PI * 4 / 3] : [0]

        for (let c = 0; c < curvesToDraw; c++) {
          ctx.strokeStyle = colors[c]
          ctx.lineWidth = 2
          ctx.beginPath()
          
          for (let x = 0; x <= width; x += 2) {
            const timeOffset = (x / width) * 2 
            const t = elapsedSecs + timeOffset
            const basePhase = (t * speed * Math.PI * 2) + globalPhaseRad + phaseOffsets[c]

            let yNorm = 0
            switch (shape) {
              case 'Sine': case 'Rainbow': yNorm = Math.sin(basePhase); break
              case 'Triangle': yNorm = 2 * Math.abs(2 * ((basePhase / (2 * Math.PI)) - Math.floor((basePhase / (2 * Math.PI)) + 0.5))) - 1; break
              case 'Sawtooth': yNorm = 2 * ((basePhase / (2 * Math.PI)) - Math.floor((basePhase / (2 * Math.PI)) + 0.5)); break
              case 'Pulse': yNorm = Math.sin(basePhase) >= 0 ? 1 : -1; break
              case 'Random': yNorm = (Math.sin(basePhase * 1.5) + Math.cos(basePhase * 2.3) + Math.sin(basePhase * 4.1)) / 3; break
              default: yNorm = Math.sin(basePhase); break
            }
            
            const y = (height / 2) - (yNorm * (size / 255) * (height / 2 - 10))
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }

        // Draw fixtures on the 1D path
        for (let i = 0; i < arrIds.length; i++) {
          const fixturePhase = (elapsedSecs * speed * Math.PI * 2) + globalPhaseRad + (i * spreadRad)
          let yNorm = 0
          switch (shape) {
            case 'Sine': case 'Rainbow': yNorm = Math.sin(fixturePhase); break
            case 'Triangle': yNorm = 2 * Math.abs(2 * ((fixturePhase / (2 * Math.PI)) - Math.floor((fixturePhase / (2 * Math.PI)) + 0.5))) - 1; break
            case 'Sawtooth': yNorm = 2 * ((fixturePhase / (2 * Math.PI)) - Math.floor((fixturePhase / (2 * Math.PI)) + 0.5)); break
            case 'Pulse': yNorm = Math.sin(fixturePhase) >= 0 ? 1 : -1; break
            case 'Random': yNorm = (Math.sin(fixturePhase * 1.5) + Math.cos(fixturePhase * 2.3) + Math.sin(fixturePhase * 4.1)) / 3; break
            default: yNorm = Math.sin(fixturePhase); break
          }
          
          const y = (height / 2) - (yNorm * (size / 255) * (height / 2 - 10))
          const x = 20 + (i * 15) // Spread out on x-axis to be visible
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#000'
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationFrameId)
  }, [shape, speed, size, sizeX, sizeY, rotation, phase, spread, selectedIds.size, target])


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
                      style={{ padding: '2px 6px', marginRight: '4px', display: 'inline-flex', alignItems: 'center' }} 
                      onClick={(e) => { e.stopPropagation(); onSetPaused(fx.id, !fx.isPaused) }}
                    >
                      {fx.isPaused ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '2px 6px', display: 'inline-flex', alignItems: 'center' }} 
                      onClick={(e) => { e.stopPropagation(); if(editingFxId === fx.id) handleClearSelection(); onRemoveEffect(fx.id); }}
                    >
                      <Trash2 size={14} />
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

            {target === 'Position' ? (
              <>
                <div className="fx-slider-group">
                  <div className="fx-slider-header">
                    <span>Size X (Pan)</span>
                    <span>{sizeX}</span>
                  </div>
                  <input type="range" min="0" max="255" step="1" value={sizeX} onChange={e => setSizeX(parseInt(e.target.value))} />
                </div>
                <div className="fx-slider-group">
                  <div className="fx-slider-header">
                    <span>Size Y (Tilt)</span>
                    <span>{sizeY}</span>
                  </div>
                  <input type="range" min="0" max="255" step="1" value={sizeY} onChange={e => setSizeY(parseInt(e.target.value))} />
                </div>
                <div className="fx-slider-group">
                  <div className="fx-slider-header">
                    <span>Rotation</span>
                    <span>{rotation}°</span>
                  </div>
                  <input type="range" min="0" max="360" step="1" value={rotation} onChange={e => setRotation(parseInt(e.target.value))} />
                </div>
              </>
            ) : (
              <div className="fx-slider-group">
                <div className="fx-slider-header">
                  <span>Size (Amplitude)</span>
                  <span>{size}</span>
                </div>
                <input type="range" min="0" max="255" step="1" value={size} onChange={e => setSize(parseInt(e.target.value))} />
              </div>
            )}

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
              style={{ width: '100%', marginTop: '1rem', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              disabled={selectedIds.size === 0}
              onClick={handleSave}
            >
              {editingFxId ? <><Edit3 size={16} /> Update Effect</> : <><PlayCircle size={16} /> Start Effect</>}
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}
