import React, { useState, useMemo } from 'react'
import { GEL_LIBRARY, hexToRgb } from '@/utils/gelLibrary'
import { ColorWheel } from './ColorWheel'
import { Search } from 'lucide-react'

interface GelPickerProps {
  onSelectColor: (r: number, g: number, b: number, hex: string) => void
}

export function GelPicker({ onSelectColor }: GelPickerProps) {
  const [activeTab, setActiveTab] = useState<'Wheel' | 'Gels'>('Wheel')
  const [activeBrand, setActiveBrand] = useState<'Lee' | 'Rosco'>('Lee')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleWheelColor = (r: number, g: number, b: number) => {
    // Generate an approximate hex for the callback if needed
    const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
    onSelectColor(r, g, b, hex)
  }

  // ── Filter Gels ────────────────────────────────────────────────────────────
  const filteredGels = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return GEL_LIBRARY.filter(g => 
      g.brand === activeBrand && 
      (g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q) || (g.category && g.category.toLowerCase().includes(q)))
    )
  }, [searchQuery, activeBrand])

  return (
    <div className="gel-picker panel p-md" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      
      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-dark)', padding: '4px', borderRadius: '8px' }}>
        <button 
          className={`btn ${activeTab === 'Wheel' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1, padding: '6px 12px', fontSize: '0.85rem', borderRadius: '6px' }}
          onClick={() => setActiveTab('Wheel')}
        >
          Color Wheel
        </button>
        <button 
          className={`btn ${activeTab === 'Gels' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1, padding: '6px 12px', fontSize: '0.85rem', borderRadius: '6px' }}
          onClick={() => setActiveTab('Gels')}
        >
          Gel Library
        </button>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {activeTab === 'Wheel' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <ColorWheel onColorChange={handleWheelColor} size={240} />
          </div>
        )}

        {activeTab === 'Gels' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-dark)', padding: '2px', borderRadius: '8px' }}>
                <button 
                  className={`btn ${activeBrand === 'Lee' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
                  onClick={() => setActiveBrand('Lee')}
                >
                  Lee
                </button>
                <button 
                  className={`btn ${activeBrand === 'Rosco' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
                  onClick={() => setActiveBrand('Rosco')}
                >
                  Rosco
                </button>
              </div>

              <div style={{ position: 'relative', width: '120px' }}>
                <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '4px 8px 4px 28px', 
                    fontSize: '0.8rem', 
                    background: 'var(--bg-dark)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '6px',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(65px, 1fr))', 
              gap: '0.5rem',
              overflowY: 'auto',
              paddingRight: '4px',
              paddingBottom: '1rem'
            }}>
              {filteredGels.map(gel => (
                <button
                  key={gel.code}
                  title={`${gel.brand} ${gel.code} - ${gel.name}`}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 4px',
                    borderRadius: '8px',
                    transition: 'background 0.2s, borderColor 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                  onClick={() => {
                    const rgb = hexToRgb(gel.hex)
                    onSelectColor(rgb.r, rgb.g, rgb.b, gel.hex)
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: gel.hex,
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{gel.code}</span>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      color: 'var(--text-secondary)',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%'
                    }}>
                      {gel.name}
                    </span>
                  </div>
                </button>
              ))}
              
              {filteredGels.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2rem' }}>
                  No gels found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
