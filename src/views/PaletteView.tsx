import { useEffect, useState, useCallback } from 'react'
import { usePaletteStore } from '@/store/usePaletteStore'
import { useDmxStore } from '@/store/useDmxStore'
import { useScenesStore } from '@/store/useScenesStore'
import { useChaserStore } from '@/store/useChaserStore'
import { useFixturesStore } from '@/store/useFixturesStore'
import { useCliStore } from '@/store/useCliStore'
import { useHistoryStore } from '@/store/useHistoryStore'
import { Plus, Trash2, Crosshair, Palette as PaletteIcon, Play } from 'lucide-react'
import type { Palette, PaletteType } from '@/types/palette'

export function PaletteView() {
  const { palettes, loadPalettes, savePalette, deletePalette } = usePaletteStore()
  const { programmer } = useDmxStore()
  const { scenes } = useScenesStore()
  const { chasers } = useChaserStore()
  const fixturesStore = useFixturesStore()
  
  const [newPaletteName, setNewPaletteName] = useState('')
  const [newPaletteType, setNewPaletteType] = useState<PaletteType>('position')
  const [applyingId, setApplyingId] = useState<string | null>(null)

  useEffect(() => {
    loadPalettes()
  }, [loadPalettes])

  const handleSavePalette = async () => {
    if (!newPaletteName.trim()) return

    // Extract current programmer values based on palette type
    const values: Record<string, any> = {}
    
    for (const [fixId, state] of Object.entries(programmer)) {
      if (newPaletteType === 'position') {
        if (state.pan !== undefined || state.tilt !== undefined) {
          values[fixId] = {
            ...(state.pan !== undefined ? { pan: state.pan } : {}),
            ...(state.tilt !== undefined ? { tilt: state.tilt } : {})
          }
        }
      } else if (newPaletteType === 'color') {
        if (state.r !== undefined || state.g !== undefined || state.b !== undefined || state.w !== undefined || state.color !== undefined) {
          values[fixId] = {
            ...(state.r !== undefined ? { r: state.r } : {}),
            ...(state.g !== undefined ? { g: state.g } : {}),
            ...(state.b !== undefined ? { b: state.b } : {}),
            ...(state.w !== undefined ? { w: state.w } : {}),
            ...(state.color !== undefined ? { color: state.color } : {})
          }
        }
      } else if (newPaletteType === 'gobo') {
        if (state.gobo !== undefined) values[fixId] = { gobo: state.gobo }
      }
    }

    if (Object.keys(values).length === 0) {
      alert(`No ${newPaletteType} values found in the active Programmer state. Please select fixtures and adjust their ${newPaletteType} first.`)
      return
    }

    await savePalette({
      name: newPaletteName,
      type: newPaletteType,
      values
    })
    
    setNewPaletteName('')
  }

  /** Apply a palette: recall its stored values onto the currently selected fixtures (or all stored fixtures if none selected) */
  const handleApplyPalette = useCallback(async (palette: Palette) => {
    setApplyingId(palette.id)
    try {
      const { patch, states, sendCommand } = fixturesStore
      const selectedUserNumbers = useCliStore.getState().selectedUserNumbers
      
      // If fixtures are selected in CLI, apply only to them; else apply to all stored
      const targetFixtures = selectedUserNumbers.length > 0
        ? patch.filter(f => f.userNumber !== undefined && selectedUserNumbers.includes(f.userNumber))
        : patch.filter(f => palette.values[f.id] !== undefined)

      if (targetFixtures.length > 0) {
        useHistoryStore.getState().pushCurrentState(`Apply Palette: ${palette.name}`)
      }

      for (const fixture of targetFixtures) {
        // Find stored values: use fixture's own saved values, or use any stored value as a template
        const storedEntry = palette.values[fixture.id] ?? Object.values(palette.values)[0]
        if (!storedEntry) continue

        if (palette.type === 'position') {
          if (storedEntry.pan !== undefined) await sendCommand(fixture.id, 'Pan', storedEntry.pan)
          if (storedEntry.tilt !== undefined) await sendCommand(fixture.id, 'Tilt', storedEntry.tilt)
        } else if (palette.type === 'color') {
          if (storedEntry.r !== undefined) await sendCommand(fixture.id, 'Red', storedEntry.r)
          if (storedEntry.g !== undefined) await sendCommand(fixture.id, 'Green', storedEntry.g)
          if (storedEntry.b !== undefined) await sendCommand(fixture.id, 'Blue', storedEntry.b)
          if (storedEntry.w !== undefined) await sendCommand(fixture.id, 'White', storedEntry.w)
          if (storedEntry.color !== undefined) await sendCommand(fixture.id, 'Color', storedEntry.color)
        } else if (palette.type === 'gobo') {
          if (storedEntry.gobo !== undefined) await sendCommand(fixture.id, 'Gobo', storedEntry.gobo)
        }
      }
    } finally {
      setApplyingId(null)
    }
  }, [fixturesStore])

  const handleDeletePalette = (id: string, name: string) => {
    let usageCount = 0
    scenes.forEach(s => {
      if (s.paletteRefs?.includes(id)) usageCount++
    })
    chasers.forEach(c => {
      if (c.steps.some(step => step.paletteRefs?.includes(id))) usageCount++
    })

    if (usageCount > 0) {
      const confirmMsg = `WARNING: The palette "${name}" is currently used in ${usageCount} Scene(s)/Chaser(s).\n\nIf you delete it, they will revert to their hardcoded base values. Are you sure you want to delete it?`
      if (!window.confirm(confirmMsg)) return
    }

    deletePalette(id)
  }

  const positions = palettes.filter(p => p.type === 'position')
  const colors = palettes.filter(p => p.type === 'color')
  const gobos = palettes.filter(p => p.type === 'gobo')

  return (
    <div className="view-full palette-view">
      <div className="view-header">
        <PaletteIcon size={20} color="var(--accent)" />
        <div className="view-header-left">
          <h2>Palettes</h2>
          <p>Save positions and colors to update multiple scenes automatically. Select fixtures in CLI first to apply only to them.</p>
        </div>
        <div className="view-header-actions palette-save-bar">
          <div className="select-wrapper palette-type-select">
            <select 
              className="styled-select" 
              value={newPaletteType} 
              onChange={e => setNewPaletteType(e.target.value as PaletteType)}
            >
              <option value="position">Position</option>
              <option value="color">Color</option>
              <option value="gobo">Gobo</option>
            </select>
            <span className="select-arrow">▾</span>
          </div>
          <input
            className="styled-input palette-name-input"
            placeholder="Palette Name (e.g. Singer, Red)"
            value={newPaletteName}
            onChange={e => setNewPaletteName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSavePalette()}
          />
          <button className="btn btn-primary btn-save" onClick={handleSavePalette}>
            <Plus size={14} /> Save
          </button>
        </div>
      </div>

      <div className="palette-grid">
        <PaletteSection 
          title="Positions" 
          icon={<Crosshair size={18} />} 
          items={positions} 
          onDelete={handleDeletePalette} 
          onApply={handleApplyPalette} 
          applyingId={applyingId} 
        />
        <PaletteSection 
          title="Colors" 
          icon={<PaletteIcon size={18} />} 
          items={colors} 
          onDelete={handleDeletePalette} 
          onApply={handleApplyPalette} 
          applyingId={applyingId} 
        />
        <PaletteSection 
          title="Gobos" 
          icon={<PaletteIcon size={18} />} 
          items={gobos} 
          onDelete={handleDeletePalette} 
          onApply={handleApplyPalette} 
          applyingId={applyingId} 
        />
      </div>

      <style>{`
        .palette-view {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          overflow-y: auto;
        }
        .palette-view .view-header {
          align-items: flex-start;
        }
        .view-header-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .view-header-left p { margin: 0; color: var(--text-muted); font-size: var(--text-sm); }
        .palette-save-bar {
          background: var(--surface-1);
          padding: 6px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          display: flex;
          gap: var(--space-2);
          margin-left: auto;
        }
        .palette-type-select { width: 110px; }
        .palette-type-select select { width: 100%; }
        .palette-name-input { width: 220px !important; }
        .btn-save { padding: 4px 12px !important; display: flex; align-items: center; gap: 6px; }
        
        .palette-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--space-5);
        }
      `}</style>
    </div>
  )
}

function PaletteSection({ title, icon, items, onDelete, onApply, applyingId }: { 
  title: string
  icon: any
  items: Palette[]
  onDelete: (id: string, name: string) => void 
  onApply: (palette: Palette) => void
  applyingId: string | null
}) {
  return (
    <div className="palette-section card">
      <div className="card-header">
        <span className="card-title">
          {icon} {title}
        </span>
      </div>
      
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-hint">No {title.toLowerCase()} palettes saved yet.</div>
        </div>
      ) : (
        <div className="palette-items">
          {items.map(p => (
            <div key={p.id} className="palette-item">
              <div className="palette-info">
                <div className="palette-name">{p.name}</div>
                <div className="palette-sub">
                  {Object.keys(p.values).length} fixture{Object.keys(p.values).length !== 1 ? 's' : ''} stored
                </div>
              </div>
              <div className="palette-actions">
                <button
                  className="btn btn-ghost btn-apply"
                  onClick={() => onApply(p)}
                  disabled={applyingId === p.id}
                  title="Apply to selected fixtures (or all stored fixtures if none selected)"
                >
                  <Play size={12} fill="currentColor" />
                  {applyingId === p.id ? '…' : 'Apply'}
                </button>
                <button 
                  className="btn-icon-sm danger"
                  onClick={() => onDelete(p.id, p.name)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .palette-section.card {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          padding-top: var(--space-3);
        }
        .palette-items {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .palette-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--surface-0);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          transition: border-color var(--duration-fast) ease, background var(--duration-fast) ease;
        }
        .palette-item:hover {
          background: var(--surface-1);
          border-color: var(--border-light);
        }
        .palette-info { display: flex; flex-direction: column; }
        .palette-name { font-weight: 600; font-size: var(--text-sm); }
        .palette-sub { font-size: var(--text-xs); color: var(--text-muted); }
        .palette-actions { display: flex; gap: var(--space-2); align-items: center; }
        .btn-apply {
          color: var(--status-ok) !important;
          font-size: var(--text-xs) !important;
          padding: 4px 10px !important;
          display: flex;
          align-items: center;
          gap: 4px;
          border-radius: var(--radius-sm);
          background: rgba(50, 215, 75, 0.1) !important;
        }
        .btn-apply:hover { background: rgba(50, 215, 75, 0.2) !important; }
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
        .btn-icon-sm.danger:hover { background: rgba(255, 69, 58, 0.15); color: var(--status-error); }
      `}</style>
    </div>
  )
}
