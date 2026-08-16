import { useEffect, useState } from 'react'
import { useCuelistStore } from '@/store/useCuelistStore'
import { useScenesStore } from '@/store/useScenesStore'
import type { Cue, Cuelist } from '@/types/cuelist'
import { ListMusic, Plus, Play, Square, FastForward, Trash2 } from 'lucide-react'

export function CuelistView() {
  const { cuelists, playback, loadCuelists, saveCuelists, addCuelist, go, stop, goto, initListener } = useCuelistStore()
  const { scenes, loadScenes } = useScenesStore()
  
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')

  useEffect(() => {
    loadCuelists()
    loadScenes()
    initListener()
  }, [loadCuelists, loadScenes, initListener])

  // Auto-select first cuelist if none selected
  useEffect(() => {
    if (!activeListId && cuelists.length > 0) {
      setActiveListId(cuelists[0].id)
    }
  }, [cuelists, activeListId])

  const activeCuelist = cuelists.find(c => c.id === activeListId)

  const handleUpdateCue = (cuelistId: string, cueId: string, updates: Partial<Cue>) => {
    const updated = cuelists.map(cl => {
      if (cl.id !== cuelistId) return cl
      return {
        ...cl,
        cues: cl.cues.map(c => c.id === cueId ? { ...c, ...updates } : c)
      }
    })
    saveCuelists(updated)
  }

  const handleAddCue = () => {
    if (!activeCuelist) return
    const newCue: Cue = {
      id: crypto.randomUUID(),
      number: activeCuelist.cues.length + 1,
      name: `Cue ${activeCuelist.cues.length + 1}`,
      sceneId: scenes.length > 0 ? scenes[0].id : null,
      fadeTime: 2000,
      delayTime: 0,
      trigger: 'manual',
      followTime: 0
    }
    
    const updated = cuelists.map(cl => {
      if (cl.id !== activeCuelist.id) return cl
      return { ...cl, cues: [...cl.cues, newCue] }
    })
    saveCuelists(updated)
  }

  const handleDeleteCue = (cueId: string) => {
    if (!activeCuelist) return
    if (!window.confirm('Delete this cue?')) return
    
    const updated = cuelists.map(cl => {
      if (cl.id !== activeCuelist.id) return cl
      return { ...cl, cues: cl.cues.filter(c => c.id !== cueId) }
    })
    saveCuelists(updated)
  }

  return (
    <div className="view-full cuelist-view">
      
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <div className="view-header">
        <ListMusic size={20} color="var(--accent)" />
        <h2>Cuelists</h2>
        
        <div className="view-header-actions" style={{ marginLeft: 'auto' }}>
          <div className="select-wrapper">
            <select 
              className="styled-select" 
              value={activeListId || ''} 
              onChange={e => setActiveListId(e.target.value)}
            >
              {cuelists.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <span className="select-arrow">▾</span>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }} />

          <input 
            type="text" 
            className="styled-input" 
            placeholder="New Cuelist Name" 
            value={newListName} 
            onChange={e => setNewListName(e.target.value)} 
          />
          <button 
            className="btn btn-ghost" 
            onClick={() => { 
              if (newListName) {
                addCuelist(newListName)
                setNewListName('') 
              }
            }}
          >
            <Plus size={14} /> New List
          </button>
        </div>
      </div>

      {/* ── Transport / Playback Controls ──────────────────────────────────── */}
      {activeCuelist && (
        <div className="card cuelist-transport">
          <button 
            className={`transport-btn-go ${playback.activeCuelistId === activeCuelist.id && playback.state === 'fading' ? 'pulsing' : ''}`}
            onClick={() => go(activeCuelist.id)}
          >
            <Play size={32} fill="currentColor" /> GO
          </button>
          
          <div className="transport-status">
            <div className="status-box current">
              <div className="status-label">CURRENT CUE</div>
              <div className="status-value">
                {activeCuelist.cues.find(c => c.id === playback.currentCueId)?.name || '---'}
              </div>
            </div>
            
            <div className="status-box next">
              <div className="status-label">NEXT CUE</div>
              <div className="status-value">
                {activeCuelist.cues.find(c => c.id === playback.nextCueId)?.name || '---'}
              </div>
            </div>
          </div>

          <button 
            className="transport-btn-stop"
            onClick={() => stop()}
          >
            <Square size={20} fill="currentColor" /> STOP
          </button>
        </div>
      )}

      {/* ── Cues Table ─────────────────────────────────────────────────────── */}
      {activeCuelist && (
        <div className="card cuelist-table-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Name</th>
                  <th>Scene</th>
                  <th style={{ width: '100px' }}>Fade (ms)</th>
                  <th style={{ width: '100px' }}>Delay (ms)</th>
                  <th style={{ width: '130px' }}>Trigger</th>
                  <th style={{ width: '100px' }}>Follow (ms)</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeCuelist.cues.sort((a, b) => a.number - b.number).map(cue => {
                  const isCurrent = playback.currentCueId === cue.id
                  const isNext = playback.nextCueId === cue.id
                  
                  return (
                    <tr key={cue.id} className={`${isCurrent ? 'row-current' : ''} ${isNext ? 'row-next' : ''}`}>
                      <td>
                        <input 
                          type="number" 
                          className="styled-input mono" 
                          style={{ width: '100%' }}
                          value={cue.number} 
                          onChange={e => handleUpdateCue(activeCuelist.id, cue.id, { number: parseFloat(e.target.value) })}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="styled-input" 
                          style={{ width: '100%' }}
                          value={cue.name} 
                          onChange={e => handleUpdateCue(activeCuelist.id, cue.id, { name: e.target.value })}
                        />
                      </td>
                      <td>
                        <div className="select-wrapper">
                          <select 
                            className="styled-select" 
                            style={{ width: '100%' }}
                            value={cue.sceneId || ''} 
                            onChange={e => handleUpdateCue(activeCuelist.id, cue.id, { sceneId: e.target.value })}
                          >
                            <option value="" disabled>Select Scene</option>
                            {scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <span className="select-arrow">▾</span>
                        </div>
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="styled-input mono" 
                          style={{ width: '100%' }}
                          value={cue.fadeTime} 
                          onChange={e => handleUpdateCue(activeCuelist.id, cue.id, { fadeTime: parseInt(e.target.value) })}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="styled-input mono" 
                          style={{ width: '100%' }}
                          value={cue.delayTime} 
                          onChange={e => handleUpdateCue(activeCuelist.id, cue.id, { delayTime: parseInt(e.target.value) })}
                        />
                      </td>
                      <td>
                        <div className="select-wrapper">
                          <select 
                            className="styled-select" 
                            style={{ width: '100%' }}
                            value={cue.trigger} 
                            onChange={e => handleUpdateCue(activeCuelist.id, cue.id, { trigger: e.target.value as 'manual' | 'follow' })}
                          >
                            <option value="manual">Manual (GO)</option>
                            <option value="follow">Follow</option>
                          </select>
                          <span className="select-arrow">▾</span>
                        </div>
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="styled-input mono" 
                          style={{ width: '100%' }}
                          value={cue.followTime}
                          disabled={cue.trigger !== 'follow'}
                          onChange={e => handleUpdateCue(activeCuelist.id, cue.id, { followTime: parseInt(e.target.value) })}
                        />
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => goto(activeCuelist.id, cue.id)}>
                            <FastForward size={14} /> Set Next
                          </button>
                          <button className="btn-icon-sm danger" onClick={() => handleDeleteCue(cue.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          <div className="cuelist-add-bar">
            <button className="btn btn-ghost" onClick={handleAddCue}>
              <Plus size={16} /> Add Cue
            </button>
          </div>
        </div>
      )}

      <style>{`
        .cuelist-view {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          overflow: hidden;
        }
        
        .cuelist-transport {
          display: flex;
          gap: var(--space-6);
          align-items: center;
          justify-content: center;
          padding: var(--space-6) var(--space-4);
          background: linear-gradient(180deg, var(--surface-1), var(--surface-0));
        }
        
        .transport-btn-go {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 1rem 3.5rem;
          border-radius: var(--radius-xl);
          background: var(--accent);
          color: #fff;
          border: none;
          cursor: pointer;
          box-shadow: 0 8px 30px rgba(10, 132, 255, 0.3);
          transition: transform var(--duration-fast) ease, box-shadow var(--duration-fast) ease;
        }
        .transport-btn-go:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 12px 40px rgba(10, 132, 255, 0.4);
        }
        .transport-btn-go.pulsing {
          animation: go-pulse 2s infinite;
        }
        
        .transport-status {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          width: 320px;
        }
        .status-box {
          padding: var(--space-3) var(--space-4);
          background: var(--surface-2);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          border-left-width: 4px;
        }
        .status-box.current { border-left-color: var(--accent); }
        .status-box.next { border-left-color: #8b5cf6; }
        
        .status-label {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.1em;
          margin-bottom: 2px;
        }
        .status-value {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--text-primary);
        }
        
        .transport-btn-stop {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.25rem;
          font-weight: 700;
          padding: 1rem 2rem;
          border-radius: var(--radius-lg);
          background: transparent;
          color: var(--status-error);
          border: 2px solid rgba(255, 69, 58, 0.3);
          cursor: pointer;
          transition: all var(--duration-fast) ease;
        }
        .transport-btn-stop:hover {
          background: rgba(255, 69, 58, 0.15);
          border-color: rgba(255, 69, 58, 0.5);
        }
        
        .cuelist-table-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
        }
        .table-wrapper {
          flex: 1;
          overflow-y: auto;
        }
        .data-table tr.row-current { background: rgba(10, 132, 255, 0.15) !important; }
        .data-table tr.row-current td { border-bottom-color: rgba(10, 132, 255, 0.3); }
        .data-table tr.row-next { background: rgba(139, 92, 246, 0.1) !important; }
        .data-table tr.row-next td { border-bottom-color: rgba(139, 92, 246, 0.2); }
        
        .table-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .cuelist-add-bar {
          padding: var(--space-3);
          border-top: 1px solid var(--border);
          background: var(--surface-1);
        }
        
        .mono { font-family: var(--font-mono); font-size: var(--text-sm) !important; }
        
        .btn-icon-sm {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: var(--radius-xs);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-icon-sm:hover { background: var(--bg-hover); color: var(--text-primary); }
        .btn-icon-sm.danger:hover { background: rgba(255, 69, 58, 0.15); color: var(--status-error); }
        .btn-sm { padding: 4px 10px !important; font-size: var(--text-xs) !important; display: flex; align-items: center; gap: 4px; }
        
        @keyframes go-pulse {
          0% { box-shadow: 0 0 0 0 rgba(10, 132, 255, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(10, 132, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(10, 132, 255, 0); }
        }
      `}</style>
    </div>
  )
}
