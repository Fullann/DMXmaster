import React, { useState, useEffect } from 'react'
import { useGroups } from '@/hooks/useGroups'
import { useFixturesStore } from '@/store/useFixturesStore'
import { useMidiStore } from '@/store/useMidiStore'
import { Plus, Trash2, Edit2, Users } from 'lucide-react'
import type { FixtureGroup } from '@/types/fixtures'

export function GroupsView() {
  const { groups, saveGroups, submasters, setSubmaster, grandMaster, setGrandMaster } = useGroups()
  const { patch } = useFixturesStore()
  
  // MIDI Integration
  const { isLearning, learningWidgetId, toggleLearning, setLearningWidget, registerCallback, unregisterCallback } = useMidiStore()
  const [faderValues, setFaderValues] = useState<Record<string, number>>({})

  // Editor State
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftFixtureIds, setDraftFixtureIds] = useState<Set<string>>(new Set())

  // Set up MIDI Callbacks for Submasters
  useEffect(() => {
    // Grand Master
    registerCallback('grandmaster', (val) => {
      setFaderValues(prev => ({ ...prev, 'grandmaster': val }))
      setGrandMaster(val / 255)
    })
    
    // Groups
    groups.forEach(g => {
      registerCallback(`submaster-${g.id}`, (val) => {
        setFaderValues(prev => ({ ...prev, [`submaster-${g.id}`]: val }))
        setSubmaster(g.id, val / 255)
      })
    })

    return () => {
      unregisterCallback('grandmaster')
      groups.forEach(g => unregisterCallback(`submaster-${g.id}`))
    }
  }, [groups, registerCallback, unregisterCallback, setGrandMaster, setSubmaster])

  // Sync internal UI faders with hook state (in case they were changed elsewhere)
  useEffect(() => {
    const nextFaders = { ...faderValues, grandmaster: grandMaster * 255 }
    groups.forEach(g => {
      nextFaders[`submaster-${g.id}`] = (submasters[g.id] ?? 1.0) * 255
    })
    setFaderValues(nextFaders)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, submasters, grandMaster])

  const handleCreateGroup = () => {
    const newId = `group_${Date.now()}`
    setEditingGroupId(newId)
    setDraftName(`New Group ${groups.length + 1}`)
    setDraftFixtureIds(new Set())
  }

  const handleEditGroup = (g: FixtureGroup) => {
    setEditingGroupId(g.id)
    setDraftName(g.name)
    setDraftFixtureIds(new Set(g.fixtureIds))
  }

  const handleSaveGroup = () => {
    if (!editingGroupId) return
    const newGroup: FixtureGroup = {
      id: editingGroupId,
      name: draftName,
      fixtureIds: Array.from(draftFixtureIds)
    }

    const existingIndex = groups.findIndex(g => g.id === editingGroupId)
    let nextGroups = [...groups]
    
    if (existingIndex >= 0) {
      nextGroups[existingIndex] = newGroup
    } else {
      nextGroups.push(newGroup)
    }

    saveGroups(nextGroups)
    setEditingGroupId(null)
  }

  const handleDeleteGroup = (id: string) => {
    saveGroups(groups.filter(g => g.id !== id))
    if (editingGroupId === id) setEditingGroupId(null)
  }

  const toggleFixture = (fixtureId: string) => {
    const next = new Set(draftFixtureIds)
    if (next.has(fixtureId)) next.delete(fixtureId)
    else next.add(fixtureId)
    setDraftFixtureIds(next)
  }

  return (
    <div className="view-full view-split">
      {/* ── LEFT: Dashboard (Submasters) ── */}
      <div className="view-panel" style={{ flex: 1.5, display: 'flex', flexDirection: 'column' }}>
        <div className="view-header">
          <Users size={20} color="var(--accent)" />
          <h2>Groups & Submasters</h2>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button 
              className={`btn ${isLearning ? 'btn-primary' : 'btn-ghost'}`}
              style={isLearning ? { background: '#00ffcc', color: '#000', borderColor: '#00ffcc' } : {}}
              onClick={() => toggleLearning()}
            >
              MIDI Learn: {isLearning ? 'ON' : 'OFF'}
            </button>
            <button className="btn btn-primary" onClick={handleCreateGroup}>
              <Plus size={16} /> New Group
            </button>
          </div>
        </div>

        <div className="dashboard-faders">
          
          {groups.map(g => {
            const wId = `submaster-${g.id}`
            const isThisLearning = learningWidgetId === wId
            return (
              <div 
                key={g.id} 
                className={`fader-strip ${isLearning ? 'learn-mode' : ''} ${isThisLearning ? 'is-learning' : ''}`}
                onClick={(e) => {
                  if (isLearning) {
                    e.stopPropagation()
                    setLearningWidget(wId)
                  }
                }}
                style={{ borderColor: isThisLearning ? '#00ffcc' : 'transparent', borderWidth: '2px', borderStyle: 'solid' }}
              >
                {isThisLearning && <div className="learn-badge">WAITING...</div>}
                
                <div className="fader-actions">
                  <button className="btn-icon-sm" onClick={(e) => { e.stopPropagation(); handleEditGroup(g) }}><Edit2 size={12} /></button>
                  <button className="btn-icon-sm danger-text" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id) }}><Trash2 size={12} /></button>
                </div>
                
                <div className="fader-track">
                  <input
                    type="range"
                    className="fader-input"
                    min={0} max={255}
                    value={faderValues[wId] ?? 255}
                    disabled={isLearning}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      setFaderValues(prev => ({ ...prev, [wId]: val }))
                      setSubmaster(g.id, val / 255)
                    }}
                  />
                </div>
                
                <div className="fader-label">
                  <strong>{g.name}</strong>
                  <span>{( (faderValues[wId] ?? 255) / 255 * 100).toFixed(0)}%</span>
                  <span>{g.fixtureIds.length} fix</span>
                </div>
              </div>
            )
          })}

          {/* Grand Master */}
          <div 
            className={`fader-strip gm-strip ${isLearning ? 'learn-mode' : ''} ${learningWidgetId === 'grandmaster' ? 'is-learning' : ''}`}
            onClick={(e) => {
              if (isLearning) {
                e.stopPropagation()
                setLearningWidget('grandmaster')
              }
            }}
            style={{ borderColor: learningWidgetId === 'grandmaster' ? '#00ffcc' : 'transparent', borderWidth: '2px', borderStyle: 'solid' }}
          >
            {learningWidgetId === 'grandmaster' && <div className="learn-badge">WAITING...</div>}
            <div className="fader-track gm-track">
              <input
                type="range"
                className="fader-input gm-input"
                min={0} max={255}
                value={faderValues['grandmaster'] ?? 255}
                disabled={isLearning}
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  setFaderValues(prev => ({ ...prev, 'grandmaster': val }))
                  setGrandMaster(val / 255)
                }}
              />
            </div>
            <div className="fader-label">
              <strong>Grand Master</strong>
              <span className="accent-text">{( (faderValues['grandmaster'] ?? 255) / 255 * 100).toFixed(0)}%</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── RIGHT: Group Editor ── */}
      <div className="view-panel" style={{ flex: 1 }}>
        <div className="view-header">
          <Edit2 size={20} />
          <h2>Editor</h2>
        </div>
        
        {editingGroupId ? (
          <div className="editor-form">
            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input 
                className="styled-input" 
                value={draftName} 
                onChange={e => setDraftName(e.target.value)} 
                placeholder="e.g. Wash Front"
              />
            </div>

            <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label className="form-label">Select Fixtures ({draftFixtureIds.size})</label>
              <div className="fixtures-grid">
                {patch.map(f => (
                  <div 
                    key={f.id} 
                    className={`fixture-btn ${draftFixtureIds.has(f.id) ? 'selected' : ''}`}
                    onClick={() => toggleFixture(f.id)}
                  >
                    <span className="fixture-addr">.{f.startAddress.toString().padStart(3, '0')}</span>
                    <span className="fixture-model">{f.label || f.profile.model}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <button className="btn btn-ghost flex-1" onClick={() => setEditingGroupId(null)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={handleSaveGroup}>Save Group</button>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Users size={48} color="var(--border)" />
            <p>Select or create a group to edit its fixtures.</p>
          </div>
        )}
      </div>

      <style>{`
        .dashboard-faders {
          display: flex;
          gap: 16px;
          padding: 16px;
          height: 100%;
          overflow-x: auto;
          align-items: flex-start;
        }

        .fader-strip {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: var(--surface-1);
          padding: 12px;
          border-radius: var(--radius-md);
          width: 90px;
          height: 380px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          position: relative;
        }
        
        .fader-strip.learn-mode { cursor: pointer; filter: grayscale(50%); transition: all 0.2s; }
        .fader-strip.learn-mode:hover { filter: grayscale(0%); transform: scale(1.02); }
        .fader-strip.is-learning { filter: grayscale(0%) brightness(1.2); box-shadow: 0 0 15px rgba(0,255,204,0.6); }
        
        .learn-badge {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #00ffcc;
          color: black;
          font-size: 0.65rem;
          font-weight: bold;
          padding: 4px;
          border-radius: 4px;
          z-index: 20;
          pointer-events: none;
        }

        .gm-strip {
          background: rgba(255, 59, 48, 0.1);
          border: 1px solid rgba(255, 59, 48, 0.3);
          margin-left: auto; /* Push GM to the right */
        }
        
        .fader-actions {
          display: flex;
          gap: 4px;
          margin-bottom: 12px;
          width: 100%;
          justify-content: center;
        }
        .btn-icon-sm {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        .btn-icon-sm:hover { background: var(--bg-hover); color: var(--text-primary); }
        .danger-text:hover { color: var(--status-error); }

        .fader-track {
          flex: 1;
          width: 10px;
          background: rgba(255,255,255,0.05);
          border-radius: 5px;
          position: relative;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.8);
          margin-bottom: 16px;
        }
        .fader-input {
          writing-mode: vertical-lr;
          direction: rtl;
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0; left: 0;
          cursor: pointer;
        }
        
        .gm-track { background: rgba(255, 59, 48, 0.2); }

        .fader-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-align: center;
          font-size: var(--text-xs);
          width: 100%;
        }
        .fader-label strong {
          color: white;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .fader-label span { color: var(--text-muted); }
        .fader-label .accent-text { color: var(--status-error); font-weight: bold; }

        .editor-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px;
          height: 100%;
        }
        
        .fixtures-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 8px;
          overflow-y: auto;
          flex: 1;
          padding: 4px;
        }

        .fixture-btn {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: all 0.15s ease;
          gap: 4px;
        }
        .fixture-btn:hover { background: var(--bg-hover); }
        .fixture-btn.selected {
          background: var(--surface-2);
          border-color: var(--accent);
          box-shadow: 0 0 0 1px var(--accent);
        }
        
        .fixture-addr { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--accent); font-weight: 600; }
        .fixture-model { font-size: var(--text-xs); color: var(--text-secondary); text-align: center; }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-muted);
          gap: 16px;
        }
      `}</style>
    </div>
  )
}
