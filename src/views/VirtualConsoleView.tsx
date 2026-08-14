import React, { useEffect, useState } from 'react'
import { useVirtualConsoleStore } from '@/store/useVirtualConsoleStore'
import { Settings, Plus, Trash2, Edit2, Play, LayoutGrid } from 'lucide-react'
import type { ConsoleWidget, WidgetTargetType } from '@/types/virtualConsole'
import { useScenesStore } from '@/store/useScenesStore'
import { useChaserStore } from '@/store/useChaserStore'

const GRID_COLS = 12
const GRID_ROWS = 6

export function VirtualConsoleView() {
  const { 
    pages, activePageId, isEditMode, 
    init, setEditMode, setActivePage, addWidget, updateWidget, removeWidget, addPage 
  } = useVirtualConsoleStore()

  const { scenes, clearProgrammer } = useScenesStore()
  const { chasers } = useChaserStore()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<Partial<ConsoleWidget> | null>(null)

  useEffect(() => {
    init()
  }, [init])

  const activePage = pages.find(p => p.id === activePageId)

  const handleCellClick = (x: number, y: number) => {
    if (!isEditMode) return
    // Check if cell is occupied
    const occupied = activePage?.widgets.find(w => 
      x >= w.x && x < w.x + w.width && y >= w.y && y < w.y + w.height
    )
    if (!occupied) {
      setEditingWidget({
        x, y, width: 1, height: 1, type: 'button', label: 'New Button', color: '#1e90ff', targetType: 'none', targetId: ''
      })
      setEditorOpen(true)
    }
  }

  const handleWidgetClick = (e: React.MouseEvent, widget: ConsoleWidget) => {
    if (isEditMode) {
      e.stopPropagation()
      setEditingWidget(widget)
      setEditorOpen(true)
    } else {
      // Play mode
      if (widget.type === 'button') {
        if (widget.targetType === 'scene' && widget.targetId) {
          window.sceneAPI.recallScene(widget.targetId)
        } else if (widget.targetType === 'chaser' && widget.targetId) {
          window.chaserAPI.start(widget.targetId)
        }
      }
    }
  }

  const handleSaveWidget = (widget: Partial<ConsoleWidget>) => {
    if (!activePage) return
    if (widget.id) {
      updateWidget(activePage.id, widget.id, widget)
    } else {
      addWidget(activePage.id, widget as any)
    }
    setEditorOpen(false)
  }

  const handleDeleteWidget = () => {
    if (activePage && editingWidget?.id) {
      removeWidget(activePage.id, editingWidget.id)
    }
    setEditorOpen(false)
  }

  return (
    <div className="view-full" style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#0a0a0a' }}>
      
      {/* ── Topbar ───────────────────────────────────────────────────────── */}
      <header style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <LayoutGrid size={24} color="var(--primary)" />
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Virtual Console</h2>
          
          <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '2rem' }}>
            {pages.map(p => (
              <button 
                key={p.id}
                className={`btn ${activePageId === p.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '6px' }}
                onClick={() => setActivePage(p.id)}
              >
                {p.name}
              </button>
            ))}
            <button className="btn btn-ghost" onClick={() => addPage(`Page ${pages.length + 1}`)}>
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', color: 'var(--status-error)' }}
            onClick={() => clearProgrammer()}
          >
            <Trash2 size={16} /> CLEAR
          </button>
          
          <button 
            className={`btn ${isEditMode ? 'btn-ghost' : 'btn-primary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
            onClick={() => setEditMode(false)}
          >
            <Play size={16} /> PLAY
          </button>
          <button 
            className={`btn ${isEditMode ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', border: isEditMode ? '1px solid var(--status-warn)' : 'none', color: isEditMode ? 'var(--status-warn)' : 'inherit', background: isEditMode ? 'rgba(255,170,0,0.1)' : 'transparent' }}
            onClick={() => setEditMode(true)}
          >
            <Settings size={16} /> EDIT
          </button>
        </div>
      </header>

      {/* ── Grid Container ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '1.5rem', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_COLS}, 80px)`,
          gridTemplateRows: `repeat(${GRID_ROWS}, 80px)`,
          gap: '8px',
          position: 'relative',
          padding: '8px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border)',
          borderRadius: '12px'
        }}>
          
          {/* Background Empty Cells for clicking in Edit Mode */}
          {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, i) => {
            const x = i % GRID_COLS
            const y = Math.floor(i / GRID_COLS)
            return (
              <div 
                key={`bg-${x}-${y}`} 
                style={{
                  gridColumn: x + 1,
                  gridRow: y + 1,
                  background: isEditMode ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: isEditMode ? '1px dashed rgba(255,255,255,0.1)' : 'none',
                  borderRadius: '8px',
                  cursor: isEditMode ? 'pointer' : 'default',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => { if (isEditMode) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                onMouseLeave={e => { if (isEditMode) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onClick={() => handleCellClick(x, y)}
              />
            )
          })}

          {/* Actual Widgets */}
          {activePage?.widgets.map(w => {
            let isMissing = false
            if (w.targetType === 'scene') isMissing = !scenes.some(s => s.id === w.targetId)
            if (w.targetType === 'chaser') isMissing = !chasers.some(c => c.id === w.targetId)

            return (
              <div 
                key={w.id}
                onClick={(e) => handleWidgetClick(e, w)}
                style={{
                  gridColumn: `${w.x + 1} / span ${w.width}`,
                  gridRow: `${w.y + 1} / span ${w.height}`,
                  background: w.type === 'button' ? (isMissing ? 'var(--status-error)' : w.color) : 'rgba(0,0,0,0.5)',
                  border: `2px solid ${w.type === 'button' ? 'rgba(255,255,255,0.2)' : w.color}`,
                  borderRadius: '8px',
                  cursor: isEditMode ? 'pointer' : (w.type === 'button' ? 'pointer' : 'default'),
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: w.type === 'button' ? 'center' : 'flex-end',
                  alignItems: 'center',
                  padding: '8px',
                  boxShadow: w.type === 'button' && !isEditMode ? '0 4px 12px rgba(0,0,0,0.5)' : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.1s, filter 0.1s',
                  zIndex: 10,
                  opacity: isMissing && !isEditMode ? 0.5 : 1
                }}
                onMouseDown={e => { if (!isEditMode && w.type === 'button') e.currentTarget.style.filter = 'brightness(1.5)' }}
                onMouseUp={e => { if (!isEditMode && w.type === 'button') e.currentTarget.style.filter = 'none' }}
                onMouseLeave={e => { if (!isEditMode && w.type === 'button') e.currentTarget.style.filter = 'none' }}
              >
                {isEditMode && (
                  <div style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', borderRadius: '4px', padding: '2px' }}>
                    <Edit2 size={12} color="white" />
                  </div>
                )}
                
                {w.type === 'button' && (
                  <span style={{ 
                    color: 'white', 
                    fontWeight: 700, 
                    textAlign: 'center', 
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                    fontSize: w.width > 1 || w.height > 1 ? '1.2rem' : '0.85rem'
                  }}>
                    {isMissing ? 'Missing Target' : w.label}
                  </span>
                )}

                {w.type === 'fader' && (
                  <>
                    <div style={{ width: '4px', height: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', position: 'absolute', top: 0 }} />
                    <input 
                      type="range" 
                      min={0} max={255} 
                      style={{ 
                        writingMode: 'vertical-lr', 
                        direction: 'rtl',
                        width: '100%', 
                        height: '80%', 
                        zIndex: 2, 
                        cursor: isEditMode ? 'pointer' : 'grab' 
                      }} 
                      disabled={isEditMode}
                      onChange={(e) => {
                        if (w.targetType === 'submaster' && w.targetId) {
                          window.fixtureAPI.setSubmaster(w.targetId, parseInt(e.target.value) / 255)
                        } else if (w.targetType === 'grandmaster') {
                          window.fixtureAPI.setGrandMaster(parseInt(e.target.value) / 255)
                        }
                      }}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'white', marginTop: 'auto', zIndex: 2, background: 'rgba(0,0,0,0.8)', padding: '2px 4px', borderRadius: '4px', textAlign: 'center' }}>
                      {w.label}
                    </span>
                  </>
                )}
              </div>
            )
          })}

        </div>
      </div>

      {/* ── Editor Modal ─────────────────────────────────────────────────── */}
      {editorOpen && editingWidget && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', zIndex: 1000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="panel p-lg" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>{editingWidget.id ? 'Edit Widget' : 'New Widget'}</h3>
            
            <div>
              <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Widget Type</label>
              <select 
                className="styled-input" style={{ width: '100%' }}
                value={editingWidget.type}
                onChange={e => setEditingWidget({...editingWidget, type: e.target.value as any})}
              >
                <option value="button">Button (Trigger)</option>
                <option value="fader">Fader (Continuous)</option>
              </select>
            </div>

            <div>
              <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Label</label>
              <input 
                className="styled-input" style={{ width: '100%' }}
                value={editingWidget.label}
                onChange={e => setEditingWidget({...editingWidget, label: e.target.value})}
              />
            </div>

            <div>
              <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Color</label>
              <input 
                type="color" className="styled-input" style={{ width: '100%', height: '40px', padding: 0 }}
                value={editingWidget.color}
                onChange={e => setEditingWidget({...editingWidget, color: e.target.value})}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Width (Cells)</label>
                <input 
                  type="number" min={1} max={4} className="styled-input" style={{ width: '100%' }}
                  value={editingWidget.width}
                  onChange={e => setEditingWidget({...editingWidget, width: parseInt(e.target.value)})}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Height (Cells)</label>
                <input 
                  type="number" min={1} max={4} className="styled-input" style={{ width: '100%' }}
                  value={editingWidget.height}
                  onChange={e => setEditingWidget({...editingWidget, height: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div>
              <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Target Type</label>
              <select 
                className="styled-input" style={{ width: '100%' }}
                value={editingWidget.targetType}
                onChange={e => setEditingWidget({...editingWidget, targetType: e.target.value as any})}
              >
                <option value="none">None</option>
                {editingWidget.type === 'button' && (
                  <>
                    <option value="scene">Scene</option>
                    <option value="chaser">Chaser</option>
                  </>
                )}
                {editingWidget.type === 'fader' && (
                  <>
                    <option value="submaster">Submaster (Group)</option>
                    <option value="grandmaster">Grand Master</option>
                  </>
                )}
              </select>
            </div>

            {['scene', 'chaser'].includes(editingWidget.targetType || '') && (
              <div>
                <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Select Target</label>
                <select 
                  className="styled-input" style={{ width: '100%' }}
                  value={editingWidget.targetId}
                  onChange={e => setEditingWidget({...editingWidget, targetId: e.target.value})}
                >
                  <option value="">-- Select --</option>
                  {editingWidget.targetType === 'scene' && scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  {editingWidget.targetType === 'chaser' && chasers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              {editingWidget.id ? (
                <button className="btn btn-ghost" style={{ color: 'var(--status-error)' }} onClick={handleDeleteWidget}>
                  <Trash2 size={16} /> Delete
                </button>
              ) : (
                <div />
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost" onClick={() => setEditorOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => handleSaveWidget(editingWidget)}>Save</button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
