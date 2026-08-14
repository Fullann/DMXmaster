import React, { useState } from 'react'
import { GEL_LIBRARY, hexToRgb } from '@/utils/gelLibrary'

interface GelPickerProps {
  onSelectColor: (r: number, g: number, b: number, hex: string) => void
}

export function GelPicker({ onSelectColor }: GelPickerProps) {
  const [activeBrand, setActiveBrand] = useState<'Lee' | 'Rosco'>('Lee')

  const [customColor, setCustomColor] = useState<string>('#ffffff')

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value
    setCustomColor(hex)
    const rgb = hexToRgb(hex)
    onSelectColor(rgb.r, rgb.g, rgb.b, hex)
  }

  const filteredGels = GEL_LIBRARY.filter(g => g.brand === activeBrand)

  return (
    <div className="gel-picker panel p-md" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      
      {/* ── Custom Color Picker ────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <input 
          type="color" 
          value={customColor} 
          onChange={handleCustomColorChange}
          style={{
            appearance: 'none',
            border: 'none',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            overflow: 'hidden',
            cursor: 'pointer',
            padding: 0,
            background: 'transparent'
          }}
          title="Custom Color Picker"
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Custom Color</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select any RGB(W) hue</span>
        </div>
      </div>

      {/* ── Gel Library Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Gel Library</h3>
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
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', 
        gap: '0.5rem',
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {filteredGels.map(gel => (
          <button
            key={gel.code}
            title={`${gel.brand} ${gel.code} - ${gel.name}`}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '6px',
              borderRadius: '8px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => {
              const rgb = hexToRgb(gel.hex)
              onSelectColor(rgb.r, rgb.g, rgb.b, gel.hex)
            }}
          >
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              backgroundColor: gel.hex,
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              border: '2px solid rgba(255,255,255,0.1)'
            }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{gel.code}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
