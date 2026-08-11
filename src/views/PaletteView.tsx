import { useEffect, useState } from 'react'
import { usePaletteStore } from '@/store/usePaletteStore'
import { useDmxStore } from '@/store/useDmxStore'
import { useScenesStore } from '@/store/useScenesStore'
import { useChaserStore } from '@/store/useChaserStore'
import { Plus, Trash2, Crosshair, Palette as PaletteIcon } from 'lucide-react'
import type { Palette, PaletteType } from '@/types/palette'

export function PaletteView() {
  const { palettes, loadPalettes, savePalette, deletePalette } = usePaletteStore()
  const { programmer } = useDmxStore()
  const { scenes } = useScenesStore()
  const { chasers } = useChaserStore()
  
  const [newPaletteName, setNewPaletteName] = useState('')
  const [newPaletteType, setNewPaletteType] = useState<PaletteType>('position')

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
    <div className="view-full" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Palettes</h2>
          <p className="text-muted">Save positions and colors to update multiple scenes automatically.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-card)', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <select 
            className="styled-input" 
            value={newPaletteType} 
            onChange={e => setNewPaletteType(e.target.value as PaletteType)}
            style={{ width: '120px' }}
          >
            <option value="position">Position</option>
            <option value="color">Color</option>
            <option value="gobo">Gobo</option>
          </select>
          <input
            className="styled-input"
            placeholder="Palette Name (e.g. Singer, Red)"
            value={newPaletteName}
            onChange={e => setNewPaletteName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSavePalette()}
          />
          <button className="btn btn-primary" onClick={handleSavePalette} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Save from Programmer
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
        
        <PaletteSection title="Positions" icon={<Crosshair size={20} />} items={positions} onDelete={handleDeletePalette} />
        <PaletteSection title="Colors" icon={<PaletteIcon size={20} />} items={colors} onDelete={handleDeletePalette} />
        <PaletteSection title="Gobos" icon={<PaletteIcon size={20} />} items={gobos} onDelete={handleDeletePalette} />

      </div>
    </div>
  )
}

function PaletteSection({ title, icon, items, onDelete }: { title: string, icon: any, items: Palette[], onDelete: (id: string, name: string) => void }) {
  if (items.length === 0) return null

  return (
    <div>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        {icon} {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: '600' }}>{p.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Used by {Object.keys(p.values).length} fixtures</div>
            </div>
            <button 
              className="btn btn-ghost" 
              style={{ color: 'var(--status-error)' }}
              onClick={() => onDelete(p.id, p.name)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
