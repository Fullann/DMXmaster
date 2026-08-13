import { useEffect, useState } from 'react'
import { useCuelistStore } from '@/store/useCuelistStore'
import { useScenesStore } from '@/store/useScenesStore'
import type { Cue, Cuelist } from '@/types/cuelist'

export function CuelistView() {
  const { cuelists, playback, loadCuelists, saveCuelists, addCuelist, go, stop, goto, initListener } = useCuelistStore()
  const { scenes, loadScenes } = useScenesStore()
  
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')

  useEffect(() => {
    loadCuelists()
    fetchScenes()
    initListener()
  }, [])

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
    <div className="view-full" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <div className="panel" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <select 
          className="styled-input" 
          value={activeListId || ''} 
          onChange={e => setActiveListId(e.target.value)}
        >
          {cuelists.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

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
          + New List
        </button>
      </div>

      {/* ── Transport / Playback Controls ──────────────────────────────────── */}
      {activeCuelist && (
        <div className="panel" style={{ display: 'flex', gap: '2rem', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          
          <button 
            className="btn btn-primary"
            style={{ 
              fontSize: '3rem', 
              padding: '1rem 4rem', 
              borderRadius: '1rem',
              backgroundColor: playback.activeCuelistId === activeCuelist.id && playback.state === 'fading' ? 'var(--accent)' : 'var(--primary)'
            }}
            onClick={() => go(activeCuelist.id)}
          >
            GO
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '300px' }}>
            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CURRENT CUE</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                {activeCuelist.cues.find(c => c.id === playback.currentCueId)?.name || '---'}
              </div>
            </div>
            
            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', borderLeft: '4px solid var(--accent)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>NEXT CUE</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                {activeCuelist.cues.find(c => c.id === playback.nextCueId)?.name || '---'}
              </div>
            </div>
          </div>

          <button 
            className="btn btn-ghost" 
            style={{ fontSize: '1.5rem', padding: '1rem 2rem', color: 'var(--error)' }}
            onClick={() => stop()}
          >
            ⏹ STOP
          </button>
        </div>
      )}

      {/* ── Cues Table ─────────────────────────────────────────────────────── */}
      {activeCuelist && (
        <div className="panel" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'rgba(0,0,0,0.5)' }}>
              <tr>
                <th style={{ padding: '1rem', width: '50px' }}>#</th>
                <th style={{ padding: '1rem' }}>Name</th>
                <th style={{ padding: '1rem' }}>Scene</th>
                <th style={{ padding: '1rem', width: '100px' }}>Fade (ms)</th>
                <th style={{ padding: '1rem', width: '100px' }}>Delay (ms)</th>
                <th style={{ padding: '1rem', width: '120px' }}>Trigger</th>
                <th style={{ padding: '1rem', width: '100px' }}>Follow (ms)</th>
                <th style={{ padding: '1rem', width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeCuelist.cues.sort((a, b) => a.number - b.number).map(cue => {
                const isCurrent = playback.currentCueId === cue.id
                const isNext = playback.nextCueId === cue.id
                
                let rowBg = 'transparent'
                if (isCurrent) rowBg = 'rgba(59, 130, 246, 0.2)' // Blue tint
                if (isNext) rowBg = 'rgba(139, 92, 246, 0.2)' // Purple tint

                return (
                  <tr key={cue.id} style={{ borderBottom: '1px solid var(--border)', background: rowBg }}>
                    <td style={{ padding: '0.5rem' }}>
                      <input 
                        type="number" 
                        className="styled-input" 
                        style={{ width: '60px' }}
                        value={cue.number} 
                        onChange={e => handleUpdateCue(activeCuelist.id, cue.id, { number: parseFloat(e.target.value) })}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input 
                        type="text" 
                        className="styled-input" 
                        style={{ width: '100%' }}
                        value={cue.name} 
                        onChange={e => handleUpdateCue(activeCuelist.id, cue.id, { name: e.target.value })}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <select 
                        className="styled-input" 
                        value={cue.sceneId || ''} 
                        onChange={e => handleUpdateCue(activeCuelist.id, cue.id, { sceneId: e.target.value })}
                      >
                        <option value="" disabled>Select Scene</option>
                        {scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input 
                        type="number" 
                        className="styled-input" 
                        style={{ width: '80px' }}
                        value={cue.fadeTime} 
                        onChange={e => handleUpdateCue(activeCuelist.id, cue.id, { fadeTime: parseInt(e.target.value) })}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input 
                        type="number" 
                        className="styled-input" 
                        style={{ width: '80px' }}
                        value={cue.delayTime} 
                        onChange={e => handleUpdateCue(activeCuelist.id, cue.id, { delayTime: parseInt(e.target.value) })}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <select 
                        className="styled-input" 
                        value={cue.trigger} 
                        onChange={e => handleUpdateCue(activeCuelist.id, cue.id, { trigger: e.target.value as 'manual' | 'follow' })}
                      >
                        <option value="manual">Manual (GO)</option>
                        <option value="follow">Follow</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input 
                        type="number" 
                        className="styled-input" 
                        style={{ width: '80px' }}
                        value={cue.followTime}
                        disabled={cue.trigger !== 'follow'}
                        onChange={e => handleUpdateCue(activeCuelist.id, cue.id, { followTime: parseInt(e.target.value) })}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" onClick={() => goto(activeCuelist.id, cue.id)}>Set Next</button>
                        <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => handleDeleteCue(cue.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          <div style={{ padding: '1rem' }}>
            <button className="btn btn-ghost" onClick={handleAddCue}>+ Add Cue</button>
          </div>
        </div>
      )}
    </div>
  )
}
