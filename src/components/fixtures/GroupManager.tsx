import { useState } from 'react'
import { useGroups } from '@/hooks/useGroups'
import { useFixtures } from '@/hooks/useFixtures'

export function GroupManager() {
  const { groups, saveGroups } = useGroups()
  const { patch } = useFixtures()
  
  const [newGroupName, setNewGroupName] = useState('')

  const handleAddGroup = () => {
    if (!newGroupName) return
    const newGroups = [...groups, { id: crypto.randomUUID(), name: newGroupName, fixtureIds: [] }]
    saveGroups(newGroups)
    setNewGroupName('')
  }

  const handleDeleteGroup = (id: string) => {
    saveGroups(groups.filter(g => g.id !== id))
  }

  const handleToggleFixture = (groupId: string, fixtureId: string) => {
    const updated = groups.map(g => {
      if (g.id !== groupId) return g
      const has = g.fixtureIds.includes(fixtureId)
      return {
        ...g,
        fixtureIds: has 
          ? g.fixtureIds.filter(id => id !== fixtureId) 
          : [...g.fixtureIds, fixtureId]
      }
    })
    saveGroups(updated)
  }

  return (
    <div className="panel" style={{ marginTop: '1rem' }}>
      <div className="panel-header">
        <span className="panel-title">Fixture Groups</span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', marginBottom: '1rem' }}>
        <input 
          type="text" 
          className="styled-input" 
          placeholder="New Group Name (e.g. All Moving Heads)"
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleAddGroup} disabled={!newGroupName}>
          Create Group
        </button>
      </div>

      <div className="patch-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {groups.map(g => (
          <div key={g.id} className="fx-active-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="fx-active-header">
              <strong>{g.name}</strong>
              <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => handleDeleteGroup(g.id)}>×</button>
            </div>
            
            <div style={{ marginTop: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
              {patch.map(fix => {
                const isSelected = g.fixtureIds.includes(fix.id)
                return (
                  <div 
                    key={fix.id} 
                    style={{ 
                      padding: '4px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(59,130,246,0.2)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}
                    onClick={() => handleToggleFixture(g.id, fix.id)}
                  >
                    <input type="checkbox" checked={isSelected} readOnly />
                    <span style={{ fontSize: '0.85rem' }}>{fix.label} (Ch {fix.startAddress})</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
