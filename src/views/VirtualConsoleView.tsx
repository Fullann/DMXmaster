import React, { useEffect, useState } from 'react'
import { useVirtualConsoleStore } from '@/store/useVirtualConsoleStore'
import { Settings, Plus, Trash2, Edit2, Play, LayoutGrid, EyeOff } from 'lucide-react'
import type { ConsoleWidget, WidgetTargetType } from '@/types/virtualConsole'
import { useScenesStore } from '@/store/useScenesStore'
import { useChaserStore } from '@/store/useChaserStore'
import { useFixturesStore } from '@/store/useFixturesStore'
import { useGroups } from '@/hooks/useGroups'
import { useMidiStore } from '@/store/useMidiStore'
import { hexToRgb } from '@/types/fixtures'

const GRID_COLS = 12
const GRID_ROWS = 6

export function VirtualConsoleView() {
  const { 
    pages, activePageId, isEditMode, 
    init, setEditMode, setActivePage, addWidget, updateWidget, removeWidget, addPage 
  } = useVirtualConsoleStore()

  const { scenes, clearProgrammer } = useScenesStore()
  const { chasers } = useChaserStore()
  const fixtures = useFixturesStore()
  const { groups } = useGroups()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<Partial<ConsoleWidget> | null>(null)
  
  // MIDI Integration
  const { initMidi, isLearning, learningWidgetId, toggleLearning, setLearningWidget, registerCallback, unregisterCallback } = useMidiStore()
  const [faderValues, setFaderValues] = useState<Record<string, number>>({})

  useEffect(() => {
    init()
    initMidi()
  }, [init, initMidi])

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
    if (isLearning) {
      e.stopPropagation()
      setLearningWidget(widget.id)
      return
    }
    
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

  // Register MIDI Callbacks
  useEffect(() => {
    if (!activePage) return
    activePage.widgets.forEach(w => {
      registerCallback(w.id, (val) => {
        if (w.type === 'button' && val > 0) {
          if (w.targetType === 'scene' && w.targetId) window.sceneAPI.recallScene(w.targetId)
          else if (w.targetType === 'chaser' && w.targetId) window.chaserAPI.start(w.targetId)
        } else if (w.type === 'fader') {
          setFaderValues(prev => ({ ...prev, [w.id]: val }))
          const v = val / 255
          if (w.targetType === 'submaster' && w.targetId) window.fixtureAPI.setSubmaster(w.targetId, v)
          else if (w.targetType === 'grandmaster') window.fixtureAPI.setGrandMaster(v)
          else if (w.targetType === 'blind') fixtures.setBlindCrossfader(v)
          else if (w.targetType === 'fixture' && w.targetId) window.fixtureAPI.setStates({ [w.targetId]: { intensity: val } })
          else if (w.targetType === 'group' && w.targetId) {
            const gObj = groups.find(g => g.id === w.targetId)
            if (gObj) {
              const stateObj: any = {}
              gObj.fixtureIds.forEach(fid => stateObj[fid] = { intensity: val })
              window.fixtureAPI.setStates(stateObj)
            }
          }
        }
      })
    })
    return () => {
      activePage.widgets.forEach(w => unregisterCallback(w.id))
    }
  }, [activePage, registerCallback, unregisterCallback, groups, fixtures])

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

  const handleColorChange = (widget: ConsoleWidget, hex: string) => {
    const { r, g, b } = hexToRgb(hex)
    if (widget.targetType === 'fixture' && widget.targetId) {
      window.fixtureAPI.setStates({ [widget.targetId]: { r, g, b, intensity: 255 } })
    } else if (widget.targetType === 'group' && widget.targetId) {
      const gObj = groups.find(g => g.id === widget.targetId)
      if (gObj) {
        const stateObj: any = {}
        gObj.fixtureIds.forEach(fid => stateObj[fid] = { r, g, b, intensity: 255 })
        window.fixtureAPI.setStates(stateObj)
      }
    }
  }

  const handleXyMove = (e: React.MouseEvent, widget: ConsoleWidget, bounds: DOMRect) => {
    if (isEditMode) return
    const xRatio = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width))
    const yRatio = Math.max(0, Math.min(1, (e.clientY - bounds.top) / bounds.height))
    const pan = Math.round(xRatio * 255)
    const tilt = Math.round((1 - yRatio) * 255)
    
    if (widget.targetType === 'fixture' && widget.targetId) {
      window.fixtureAPI.setStates({ [widget.targetId]: { pan, tilt } })
    } else if (widget.targetType === 'group' && widget.targetId) {
      const gObj = groups.find(g => g.id === widget.targetId)
      if (gObj) {
        const stateObj: any = {}
        gObj.fixtureIds.forEach(fid => stateObj[fid] = { pan, tilt })
        window.fixtureAPI.setStates(stateObj)
      }
    }
  }

  return (
    <div className="view-full vc-view">
      
      {/* ── Topbar ───────────────────────────────────────────────────────── */}
      <div className="view-header vc-header">
        <LayoutGrid size={24} color="var(--accent)" />
        <h2>Virtual Console</h2>
        
        <div className="vc-page-tabs">
          {pages.map(p => (
            <button 
              key={p.id}
              className={`vc-page-btn ${activePageId === p.id ? 'active' : ''}`}
              onClick={() => setActivePage(p.id)}
            >
              {p.name}
            </button>
          ))}
          <button className="btn-icon-sm" onClick={() => addPage(`Page ${pages.length + 1}`)}>
            <Plus size={16} />
          </button>
        </div>

        <div className="view-header-actions vc-actions">
          <button 
            className={`btn ${fixtures.isBlindMode ? 'btn-danger' : 'btn-ghost'}`}
            style={{ 
              color: fixtures.isBlindMode ? '#fff' : 'var(--status-warn)', 
              background: fixtures.isBlindMode ? 'var(--status-error)' : 'rgba(255,170,0,0.1)' 
            }}
            onClick={() => fixtures.setBlindMode(!fixtures.isBlindMode)}
          >
            <EyeOff size={16} /> {fixtures.isBlindMode ? 'BLIND ACTIVE' : 'BLIND'}
          </button>
          
          <button 
            className="btn btn-ghost danger-text"
            onClick={() => clearProgrammer()}
          >
            <Trash2 size={16} /> CLEAR
          </button>
          
          <div className="vc-mode-toggle">
            <button 
              className={`vc-mode-btn ${isLearning ? 'active-learn' : ''}`}
              onClick={() => toggleLearning()}
              title="MIDI Learn"
            >
              MIDI {isLearning ? 'ON' : 'OFF'}
            </button>
            <div style={{ width: '1px', background: 'var(--border)', margin: '4px' }}></div>
            <button 
              className={`vc-mode-btn ${!isEditMode && !isLearning ? 'active-play' : ''}`}
              onClick={() => { setEditMode(false); if(isLearning) toggleLearning() }}
            >
              <Play size={14} fill={!isEditMode && !isLearning ? "currentColor" : "none"} /> PLAY
            </button>
            <button 
              className={`vc-mode-btn ${isEditMode ? 'active-edit' : ''}`}
              onClick={() => { setEditMode(true); if(isLearning) toggleLearning() }}
            >
              <Settings size={14} /> EDIT
            </button>
          </div>
        </div>
      </div>

      {/* ── Grid Container ───────────────────────────────────────────────── */}
      <div className="vc-grid-container">
        <div className="vc-grid" style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, 80px)`,
          gridTemplateRows: `repeat(${GRID_ROWS}, 80px)`,
        }}>
          
          {/* Background Empty Cells for clicking in Edit Mode */}
          {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, i) => {
            const x = i % GRID_COLS
            const y = Math.floor(i / GRID_COLS)
            return (
              <div 
                key={`bg-${x}-${y}`} 
                className={`vc-bg-cell ${isEditMode ? 'edit-mode' : ''}`}
                style={{
                  gridColumn: x + 1,
                  gridRow: y + 1,
                }}
                onClick={() => handleCellClick(x, y)}
                onDragOver={(e) => {
                  if (isEditMode) e.preventDefault()
                }}
                onDrop={(e) => {
                  if (!isEditMode) return
                  const id = e.dataTransfer.getData('widgetId')
                  const widget = activePage?.widgets.find(w => w.id === id)
                  if (widget) {
                    updateWidget(activePage.id, id, { ...widget, x, y })
                  }
                }}
              />
            )
          })}

          {/* Actual Widgets */}
          {activePage?.widgets.map(w => {
            let isMissing = false
            if (w.targetType === 'scene') isMissing = !scenes.some(s => s.id === w.targetId)
            if (w.targetType === 'chaser') isMissing = !chasers.some(c => c.id === w.targetId)

            const rangeProps: any = {
              value: faderValues[w.id] ?? 0
            }
            if (w.targetType === 'blind') {
              rangeProps.value = fixtures.blindCrossfader * 255
            }

            const widgetBg = w.type === 'button' ? (isMissing ? 'var(--status-error)' : w.color) : 'var(--surface-0)'
            const widgetBorder = w.type === 'button' ? 'rgba(255,255,255,0.2)' : w.color
            
            const isThisLearning = learningWidgetId === w.id

            return (
              <div 
                key={w.id}
                className={`vc-widget ${w.type} ${isEditMode ? 'edit-mode' : ''} ${isMissing && !isEditMode ? 'missing' : ''} ${isLearning ? 'learn-mode' : ''} ${isThisLearning ? 'is-learning' : ''}`}
                onClick={(e) => handleWidgetClick(e, w)}
                draggable={isEditMode}
                onDragStart={(e) => {
                  if (isEditMode) e.dataTransfer.setData('widgetId', w.id)
                }}
                style={{
                  gridColumn: `${w.x + 1} / span ${w.width}`,
                  gridRow: `${w.y + 1} / span ${w.height}`,
                  background: widgetBg,
                  borderColor: isThisLearning ? '#00ffcc' : widgetBorder,
                }}
              >
                {isEditMode && (
                  <div className="vc-edit-badge">
                    <Edit2 size={12} color="white" />
                  </div>
                )}
                {isThisLearning && (
                  <div className="vc-learn-badge">
                    WAITING FOR MIDI...
                  </div>
                )}
                
                {w.type === 'button' && (
                  <span className="vc-button-label" style={{ fontSize: w.width > 1 || w.height > 1 ? '1.2rem' : '0.85rem' }}>
                    {isMissing ? 'Missing Target' : w.label}
                  </span>
                )}

                {w.type === 'fader' && (
                  <>
                    <div className="vc-fader-track" />
                    <input 
                      type="range" 
                      className="vc-fader-input"
                      min={0} max={255} 
                      {...rangeProps}
                      disabled={isEditMode || isLearning}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        setFaderValues(prev => ({ ...prev, [w.id]: val }))
                        if (w.targetType === 'submaster' && w.targetId) {
                          window.fixtureAPI.setSubmaster(w.targetId, val / 255)
                        } else if (w.targetType === 'grandmaster') {
                          window.fixtureAPI.setGrandMaster(val / 255)
                        } else if (w.targetType === 'blind') {
                          fixtures.setBlindCrossfader(val / 255)
                        } else if (w.targetType === 'fixture' && w.targetId) {
                          window.fixtureAPI.setStates({ [w.targetId]: { intensity: val } })
                        } else if (w.targetType === 'group' && w.targetId) {
                          const gObj = groups.find(g => g.id === w.targetId)
                          if (gObj) {
                            const stateObj: any = {}
                            gObj.fixtureIds.forEach(fid => stateObj[fid] = { intensity: val })
                            window.fixtureAPI.setStates(stateObj)
                          }
                        }
                      }}
                    />
                    <span className="vc-fader-label">{w.label}</span>
                  </>
                )}

                {w.type === 'colorPicker' && (
                  <div className="vc-color-picker-wrapper">
                    <input 
                      type="color" 
                      className="vc-color-input-native"
                      defaultValue="#ffffff"
                      disabled={isEditMode}
                      onChange={(e) => handleColorChange(w, e.target.value)}
                    />
                    <span className="vc-color-label">{w.label}</span>
                  </div>
                )}

                {w.type === 'xyPad' && (
                  <div 
                    className="vc-xy-pad"
                    onMouseMove={(e) => {
                      if (e.buttons === 1) {
                        handleXyMove(e, w, e.currentTarget.getBoundingClientRect())
                      }
                    }}
                    onMouseDown={(e) => handleXyMove(e, w, e.currentTarget.getBoundingClientRect())}
                  >
                    <div className="vc-xy-grid"></div>
                    <span className="vc-xy-label">{w.label}</span>
                  </div>
                )}
              </div>
            )
          })}

        </div>
      </div>

      {/* ── Editor Modal ─────────────────────────────────────────────────── */}
      {editorOpen && editingWidget && (
        <div className="vc-modal-overlay">
          <div className="card vc-modal">
            <div className="card-header">
              <span className="card-title">{editingWidget.id ? 'Edit Widget' : 'New Widget'}</span>
            </div>
            
            <div className="vc-modal-body">
              <div className="form-group">
                <label className="form-label">Widget Type</label>
                <div className="select-wrapper">
                  <select 
                    className="styled-select" 
                    value={editingWidget.type}
                    onChange={e => setEditingWidget({...editingWidget, type: e.target.value as any})}
                  >
                    <option value="button">Button (Trigger)</option>
                    <option value="fader">Fader (Continuous)</option>
                    <option value="colorPicker">Color Picker</option>
                    <option value="xyPad">X/Y Pad</option>
                  </select>
                  <span className="select-arrow">▾</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Label</label>
                <input 
                  className="styled-input" 
                  value={editingWidget.label}
                  onChange={e => setEditingWidget({...editingWidget, label: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Color</label>
                <input 
                  type="color" className="styled-input color-input" 
                  value={editingWidget.color}
                  onChange={e => setEditingWidget({...editingWidget, color: e.target.value})}
                />
              </div>

              <div className="vc-modal-row">
                <div className="form-group flex-1">
                  <label className="form-label">Width (Cells)</label>
                  <input 
                    type="number" min={1} max={4} className="styled-input" 
                    value={editingWidget.width}
                    onChange={e => setEditingWidget({...editingWidget, width: parseInt(e.target.value)})}
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Height (Cells)</label>
                  <input 
                    type="number" min={1} max={4} className="styled-input" 
                    value={editingWidget.height}
                    onChange={e => setEditingWidget({...editingWidget, height: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Target Type</label>
                <div className="select-wrapper">
                  <select 
                    className="styled-select" 
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
                        <option value="blind">Blind Crossfader</option>
                        <option value="fixture">Single Fixture (Intensity)</option>
                        <option value="group">Fixture Group (Intensity)</option>
                      </>
                    )}
                    {['colorPicker', 'xyPad'].includes(editingWidget.type || '') && (
                      <>
                        <option value="fixture">Single Fixture</option>
                        <option value="group">Fixture Group</option>
                      </>
                    )}
                  </select>
                  <span className="select-arrow">▾</span>
                </div>
              </div>

              {['scene', 'chaser', 'fixture', 'group', 'submaster'].includes(editingWidget.targetType || '') && (
                <div className="form-group">
                  <label className="form-label">Select Target</label>
                  <div className="select-wrapper">
                    <select 
                      className="styled-select" 
                      value={editingWidget.targetId}
                      onChange={e => setEditingWidget({...editingWidget, targetId: e.target.value})}
                    >
                      <option value="">-- Select --</option>
                      {editingWidget.targetType === 'scene' && scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      {editingWidget.targetType === 'chaser' && chasers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      {editingWidget.targetType === 'fixture' && fixtures.patch.map(f => <option key={f.id} value={f.id}>{f.label || f.profile.model}</option>)}
                      {['group', 'submaster'].includes(editingWidget.targetType || '') && groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <span className="select-arrow">▾</span>
                  </div>
                </div>
              )}
            </div>

            <div className="vc-modal-actions">
              {editingWidget.id ? (
                <button className="btn btn-ghost danger-text" onClick={handleDeleteWidget}>
                  <Trash2 size={16} /> Delete
                </button>
              ) : (
                <div />
              )}
              <div className="vc-modal-actions-right">
                <button className="btn btn-ghost" onClick={() => setEditorOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => handleSaveWidget(editingWidget)}>Save</button>
              </div>
            </div>

          </div>
        </div>
      )}

      <style>{`
        .vc-view {
          display: flex;
          flex-direction: column;
          background: #000; /* Deep black background for VC */
          padding: 0 !important;
        }
        
        .vc-header {
          border-bottom: 1px solid var(--border);
          background: var(--surface-1);
          padding: var(--space-3) var(--space-5) !important;
        }

        .vc-page-tabs {
          display: flex;
          gap: 4px;
          margin-left: var(--space-6);
        }
        
        .vc-page-btn {
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: var(--text-sm);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--duration-fast) ease;
        }
        .vc-page-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        .vc-page-btn.active {
          background: var(--surface-2);
          border-color: var(--border-light);
          color: var(--text-primary);
        }

        .vc-actions { margin-left: auto; }
        
        .vc-mode-toggle {
          display: flex;
          background: var(--surface-2);
          border-radius: var(--radius-sm);
          padding: 2px;
          border: 1px solid var(--border);
        }
        .vc-mode-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 6px 16px;
          font-size: var(--text-xs);
          font-weight: 700;
          letter-spacing: 0.05em;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all var(--duration-fast) ease;
        }
        .vc-mode-btn.active-play {
          background: var(--status-ok);
          color: #000;
        }
        .vc-mode-btn.active-edit {
          background: var(--status-warn);
          color: #000;
        }
        .vc-mode-btn.active-learn {
          background: #00ffcc;
          color: #000;
        }

        .vc-grid-container {
          flex: 1;
          padding: var(--space-6);
          overflow: auto;
          display: flex;
          justify-content: center;
        }
        .vc-grid {
          display: grid;
          gap: 8px;
          position: relative;
          padding: 8px;
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: inset 0 2px 20px rgba(0,0,0,0.5);
        }
        
        .vc-bg-cell {
          background: transparent;
          border-radius: var(--radius-md);
          transition: background var(--duration-fast) ease;
        }
        .vc-bg-cell.edit-mode {
          background: rgba(255,255,255,0.03);
          border: 1px dashed rgba(255,255,255,0.1);
          cursor: pointer;
        }
        .vc-bg-cell.edit-mode:hover { background: rgba(255,255,255,0.08); }
        
        .vc-widget {
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px;
          position: relative;
          overflow: hidden;
          transition: transform 0.1s, filter 0.1s;
          z-index: 10;
          border-width: 2px;
          border-style: solid;
        }
        .vc-widget.button { justify-content: center; }
        .vc-widget.button:not(.edit-mode) {
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .vc-widget.button:not(.edit-mode):active { filter: brightness(1.3); transform: scale(0.98); }
        
        .vc-widget.fader { justify-content: flex-end; }
        .vc-widget.missing:not(.edit-mode) { opacity: 0.5; }
        .vc-widget.edit-mode { cursor: pointer; }
        .vc-widget.learn-mode { cursor: pointer; filter: grayscale(50%); transition: all 0.2s; }
        .vc-widget.learn-mode:hover { filter: grayscale(0%); transform: scale(1.02); }
        .vc-widget.is-learning { filter: grayscale(0%) brightness(1.2); box-shadow: 0 0 15px rgba(0,255,204,0.6); animation: pulse-border 1.5s infinite; }
        
        @keyframes pulse-border {
          0% { border-color: rgba(0,255,204,0.5); }
          50% { border-color: rgba(0,255,204,1); }
          100% { border-color: rgba(0,255,204,0.5); }
        }
        
        .vc-edit-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background: rgba(0,0,0,0.6);
          border-radius: 4px;
          padding: 4px;
        }

        .vc-learn-badge {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #00ffcc;
          color: black;
          font-size: 0.7rem;
          font-weight: bold;
          padding: 4px 8px;
          border-radius: 4px;
          z-index: 20;
          text-align: center;
          pointer-events: none;
        }
        
        .vc-button-label {
          color: white;
          font-weight: 700;
          text-align: center;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
          line-height: 1.2;
        }
        
        .vc-fader-track {
          width: 6px;
          height: calc(100% - 30px);
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          position: absolute;
          top: 8px;
          box-shadow: inset 0 1px 4px rgba(0,0,0,0.5);
        }
        .vc-fader-input {
          writing-mode: vertical-lr;
          direction: rtl;
          width: 100%;
          height: calc(100% - 24px);
          z-index: 2;
          margin-bottom: auto;
        }
        .vc-widget:not(.edit-mode) .vc-fader-input { cursor: grab; }
        
        .vc-fader-label {
          font-size: var(--text-2xs);
          color: white;
          z-index: 2;
          background: rgba(0,0,0,0.8);
          padding: 2px 6px;
          border-radius: 4px;
          text-align: center;
          margin-top: 4px;
          width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .vc-color-picker-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          gap: 4px;
        }
        .vc-color-input-native {
          width: 80%;
          height: 60%;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 50%;
          overflow: hidden;
        }
        .vc-color-input-native::-webkit-color-swatch-wrapper { padding: 0; }
        .vc-color-input-native::-webkit-color-swatch { border: 2px solid rgba(255,255,255,0.2); border-radius: 50%; }
        
        .vc-xy-pad {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          position: relative;
          background: rgba(0,0,0,0.4);
          border-radius: var(--radius-sm);
          overflow: hidden;
          cursor: crosshair;
        }
        .vc-xy-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 20% 20%;
          pointer-events: none;
        }
        .vc-color-label, .vc-xy-label {
          color: white;
          font-weight: bold;
          font-size: 0.75rem;
          text-align: center;
          background: rgba(0,0,0,0.7);
          padding: 2px 6px;
          border-radius: 4px;
          pointer-events: none;
          z-index: 2;
          margin-bottom: 4px;
        }
        
        /* Modal Styles */
        .vc-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vc-modal {
          width: 400px;
          display: flex;
          flex-direction: column;
        }
        .vc-modal-body {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          padding: var(--space-4);
        }
        .vc-modal-row {
          display: flex;
          gap: var(--space-3);
        }
        .flex-1 { flex: 1; }
        .color-input {
          height: 38px !important;
          padding: 2px !important;
        }
        .vc-modal-actions {
          display: flex;
          justify-content: space-between;
          padding: var(--space-3) var(--space-4);
          border-top: 1px solid var(--border);
          background: var(--surface-1);
          border-bottom-left-radius: var(--radius-lg);
          border-bottom-right-radius: var(--radius-lg);
        }
        .vc-modal-actions-right {
          display: flex;
          gap: var(--space-2);
        }
        
        .danger-text { color: var(--status-error) !important; }
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
      `}</style>
    </div>
  )
}
