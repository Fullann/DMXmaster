import { useGroups } from '@/hooks/useGroups'

export function SubmasterConsole() {
  const { groups, grandMaster, setGrandMaster, submasters, setSubmaster } = useGroups()

  if (groups.length === 0) return null

  return (
    <div className="panel" style={{ marginBottom: '1rem' }}>
      <div className="panel-header">
        <span className="panel-title">Submasters</span>
      </div>

      <div style={{ display: 'flex', gap: '2rem', overflowX: 'auto', padding: '1rem 0' }}>
        
        {/* Grand Master */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
          <div style={{ 
            fontSize: '0.7rem', 
            marginBottom: '0.5rem', 
            textAlign: 'center', 
            color: 'var(--error)', 
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%'
          }}>
            GRAND
          </div>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            value={grandMaster} 
            onChange={(e) => setGrandMaster(parseFloat(e.target.value))}
            style={{ 
              writingMode: 'bt-lr', /* IE */
              WebkitAppearance: 'slider-vertical', /* Chrome */
              width: '8px', 
              height: '150px',
              accentColor: 'var(--error)'
            }}
          />
          <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
            {Math.round(grandMaster * 100)}%
          </div>
        </div>

        <div style={{ width: '1px', backgroundColor: 'var(--border)', margin: '0 1rem' }} />

        {/* Group Submasters */}
        {groups.map(g => {
          const level = submasters[g.id] ?? 1.0
          return (
            <div key={g.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
              <div style={{ 
                fontSize: '0.7rem', 
                marginBottom: '0.5rem', 
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%'
              }}>
                {g.name}
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                value={level} 
                onChange={(e) => setSubmaster(g.id, parseFloat(e.target.value))}
                style={{ 
                  writingMode: 'bt-lr',
                  WebkitAppearance: 'slider-vertical',
                  width: '8px', 
                  height: '150px',
                  accentColor: 'var(--primary)'
                }}
              />
              <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                {Math.round(level * 100)}%
              </div>
            </div>
          )
        })}

      </div>
    </div>
  )
}
