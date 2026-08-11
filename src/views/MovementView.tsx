import { useState, useCallback } from 'react'
import { useFixturesStore } from '@/store/useFixturesStore'
import { useDmxStore } from '@/store/useDmxStore'
import { getFixtureCapabilities, hexToRgb } from '@/types/fixtures'
import { XYPad } from '@/components/control/XYPad'
import { Target, MoveHorizontal, MoveVertical, RefreshCcw, Sun, Palette } from 'lucide-react'

export function MovementView() {
  const patch = useFixturesStore(s => s.patch)
  
  // Local state for the pad
  const [padX, setPadX] = useState(128)
  const [padY, setPadY] = useState(128)
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [invertPan, setInvertPan] = useState<Set<string>>(new Set())
  const [invertTilt, setInvertTilt] = useState<Set<string>>(new Set())

  const [globalIntensity, setGlobalIntensity] = useState(255)
  const [globalColor, setGlobalColor] = useState('#ffffff')

  // Filter only fixtures that have Pan/Tilt
  const movingFixtures = patch.filter(f => getFixtureCapabilities(f).hasPanTilt)

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleInvertPan = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const next = new Set(invertPan)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setInvertPan(next)
  }

  const toggleInvertTilt = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const next = new Set(invertTilt)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setInvertTilt(next)
  }

  const handleGlobalIntensity = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setGlobalIntensity(val)
    const sendCommand = useFixturesStore.getState().sendCommand
    for (const f of movingFixtures) {
      if (selectedIds.has(f.id) && getFixtureCapabilities(f).hasIntensity) {
        sendCommand(f.id, 'Intensity', val)
      }
    }
  }

  const handleGlobalColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value
    setGlobalColor(hex)
    const { r, g, b } = hexToRgb(hex)
    const sendColor = useFixturesStore.getState().sendColor
    for (const f of movingFixtures) {
      if (selectedIds.has(f.id) && getFixtureCapabilities(f).hasRgb) {
        sendColor(f.id, r, g, b)
      }
    }
  }

  const selectAll = () => setSelectedIds(new Set(movingFixtures.map(f => f.id)))
  const clearSelection = () => setSelectedIds(new Set())

  const handlePadChange = useCallback((x: number, y: number) => {
    setPadX(x)
    setPadY(y)

    const sendCommand = useFixturesStore.getState().sendCommand
    
    // Update all selected fixtures
    for (const f of movingFixtures) {
      if (!selectedIds.has(f.id)) continue
      
      const invPan = invertPan.has(f.id)
      const invTilt = invertTilt.has(f.id)
      
      const finalX = invPan ? 255 - x : x
      const finalY = invTilt ? 255 - y : y
      
      const cap = getFixtureCapabilities(f)
      if (cap.hasPanTilt) {
        sendCommand(f.id, 'Pan', finalX)
        sendCommand(f.id, 'Tilt', finalY)
      }
    }
  }, [movingFixtures, selectedIds, invertPan, invertTilt])

  return (
    <div className="view-full movement-view">
      {/* ── Left Sidebar: Fixture Selection ─────────────────────────────── */}
      <aside className="movement-sidebar">
        <div className="panel-header">
          <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={18} /> Follow Spot
          </span>
        </div>
        
        <div className="movement-actions">
          <button className="btn btn-ghost" onClick={selectAll}>Select All</button>
          <button className="btn btn-ghost" onClick={clearSelection}>Clear</button>
        </div>

        <div className="movement-fixture-list">
          {movingFixtures.length === 0 ? (
            <div className="movement-empty">No moving heads patched.</div>
          ) : (
            movingFixtures.map(f => (
              <div 
                key={f.id} 
                className={`movement-fixture-card ${selectedIds.has(f.id) ? 'selected' : ''}`}
                onClick={() => toggleSelection(f.id)}
              >
                <div className="mfc-header">
                  <span className="mfc-addr">.{f.startAddress.toString().padStart(3, '0')}</span>
                  <span className="mfc-name">{f.label || f.profile.model}</span>
                </div>
                
                {/* Invert Toggles */}
                <div className="mfc-inverts">
                  <button 
                    className={`btn-invert ${invertPan.has(f.id) ? 'active' : ''}`}
                    onClick={(e) => toggleInvertPan(e, f.id)}
                    title="Invert Pan"
                  >
                    <RefreshCcw size={12} /> Pan
                  </button>
                  <button 
                    className={`btn-invert ${invertTilt.has(f.id) ? 'active' : ''}`}
                    onClick={(e) => toggleInvertTilt(e, f.id)}
                    title="Invert Tilt"
                  >
                    <RefreshCcw size={12} /> Tilt
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Global Controls */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sun size={14}/> Intensity</span>
              <strong>{globalIntensity}</strong>
            </div>
            <input 
              type="range" min={0} max={255} 
              value={globalIntensity} 
              onChange={handleGlobalIntensity}
              className="lc-slider"
              style={{ '--lc-color': 'var(--text-primary)' } as React.CSSProperties}
              disabled={selectedIds.size === 0}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Palette size={14}/> Color</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{globalColor.toUpperCase()}</strong>
            </div>
            <input 
              type="color" 
              value={globalColor} 
              onChange={handleGlobalColor}
              className="lc-color-picker"
              style={{ width: '100%' }}
              disabled={selectedIds.size === 0}
            />
          </div>
        </div>
      </aside>

      {/* ── Main Area: XY Pad ────────────────────────────────────────────── */}
      <main className="movement-main panel">
        <div className="xy-pad-wrapper">
          <XYPad x={padX} y={padY} onChange={handlePadChange} />
          
          <div className="xy-pad-readouts">
            <div className="xy-readout">
              <MoveHorizontal size={14} /> Pan: <strong>{padX}</strong>
            </div>
            <div className="xy-readout">
              <MoveVertical size={14} /> Tilt: <strong>{padY}</strong>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
