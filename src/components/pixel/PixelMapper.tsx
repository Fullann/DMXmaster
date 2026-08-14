import { useState } from 'react'
import { usePixelMapper } from '@/hooks/usePixelMapper'
import type { MatrixRouting } from '@/types/pixel'

export function PixelMapper() {
  const pixel = usePixelMapper()
  
  const [formName, setFormName] = useState('')
  const [formWidth, setFormWidth] = useState(10)
  const [formHeight, setFormHeight] = useState(10)
  const [formUniv, setFormUniv] = useState(0)
  const [formChan, setFormChan] = useState(1)
  const [formRouting, setFormRouting] = useState<MatrixRouting>('ZigZag')

  const handleAddMatrix = () => {
    if (!formName) return
    pixel.addMatrix({
      name: formName,
      width: formWidth,
      height: formHeight,
      startUniverse: formUniv,
      startChannel: formChan,
      routing: formRouting
    })
    setFormName('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      pixel.loadMedia(e.target.files[0])
    }
  }

  return (
    <div className="audio-dashboard">
      {/* Reusing audio dashboard layout (3 columns) */}
      
      {/* ── Left Column: Media Player ──────────────────────────────────────── */}
      <div className="audio-col panel">
        <div className="panel-header">
          <span className="panel-title">Media Engine</span>
        </div>
        
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label">Load Video or Image</label>
          <input type="file" accept="video/*,image/*" className="styled-input" onChange={handleFileChange} />
        </div>

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label">Or Use Built-in Generators</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className={`btn ${pixel.activeGenerator === 'Rainbow' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => pixel.setGenerator('Rainbow')}>Rainbow</button>
            <button className={`btn ${pixel.activeGenerator === 'Plasma' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => pixel.setGenerator('Plasma')}>Plasma</button>
            <button className={`btn ${pixel.activeGenerator === 'Strobe' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => pixel.setGenerator('Strobe')}>Strobe</button>
          </div>
        </div>

        <div className="audio-visualizer" style={{ padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {pixel.mediaType === 'generator' ? (
            <canvas
              ref={pixel.previewCanvasRef}
              width={200}
              height={200}
              style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
            />
          ) : pixel.mediaUrl ? (
            pixel.mediaType === 'video' ? (
              <video 
                ref={pixel.videoRef} 
                src={pixel.mediaUrl} 
                autoPlay 
                loop 
                muted 
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <img 
                src={pixel.mediaUrl} 
                alt="media"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            )
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>No Media Loaded</span>
          )}
        </div>

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', marginTop: '1rem' }}
          onClick={pixel.togglePlay}
          disabled={!pixel.mediaType}
        >
          {pixel.isPlaying ? '⏸ Pause Effect' : '▶ Play Effect'}
        </button>
      </div>

      {/* ── Center Column: Add Matrix ──────────────────────────────────────── */}
      <div className="audio-col panel">
        <div className="panel-header">
          <span className="panel-title">Configure LED Matrix</span>
        </div>
        
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label">Matrix Name</label>
          <input type="text" className="styled-input" value={formName} onChange={e => setFormName(e.target.value)} />
        </div>

        <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Width (Pixels)</label>
            <input type="number" className="styled-input" min="1" value={formWidth} onChange={e => setFormWidth(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Height (Pixels)</label>
            <input type="number" className="styled-input" min="1" value={formHeight} onChange={e => setFormHeight(Number(e.target.value))} />
          </div>
        </div>

        <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Start Universe</label>
            <input type="number" className="styled-input" min="0" value={formUniv} onChange={e => setFormUniv(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Start Channel</label>
            <input type="number" className="styled-input" min="1" max="512" value={formChan} onChange={e => setFormChan(Number(e.target.value))} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Routing Pattern</label>
          <select className="styled-input" value={formRouting} onChange={e => setFormRouting(e.target.value as MatrixRouting)}>
            <option value="ZigZag">ZigZag (Serpentine)</option>
            <option value="Linear">Linear</option>
          </select>
        </div>

        <div className="busking-empty-hint" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Max ~170 pixels (510 channels) per matrix for single-universe mapping.
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: 'auto' }} onClick={handleAddMatrix} disabled={!formName}>
          Add Matrix
        </button>
      </div>

      {/* ── Right Column: Active Matrices ──────────────────────────────────── */}
      <div className="audio-col panel">
        <div className="panel-header">
          <span className="panel-title">Active Matrices ({pixel.config.matrices.length})</span>
        </div>
        <div className="fx-active-list" style={{ marginTop: '0.5rem' }}>
          {pixel.config.matrices.length === 0 ? (
            <div className="busking-empty-hint" style={{ textAlign: 'center', padding: '2rem 0' }}>No matrices configured</div>
          ) : (
            pixel.config.matrices.map(m => (
              <div key={m.id} className="fx-active-card">
                <div className="fx-active-header">
                  <strong>{m.name}</strong>
                  <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => pixel.removeMatrix(m.id)}>×</button>
                </div>
                <div className="fx-active-meta">
                  Resolution: {m.width}x{m.height} ({m.width * m.height} pixels)
                </div>
                <div className="fx-active-meta" style={{ marginTop: '4px' }}>
                  Address: Univ {m.startUniverse} / Ch {m.startChannel}
                </div>
                <div className="fx-active-meta" style={{ marginTop: '4px' }}>
                  Routing: {m.routing}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
    </div>
  )
}
