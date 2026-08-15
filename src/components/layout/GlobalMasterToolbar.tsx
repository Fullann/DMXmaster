import { useState, useEffect } from 'react'
import { MidiLearnable } from '@/components/midi/MidiLearnable'
import { Power, PauseCircle, Activity, Maximize2 } from 'lucide-react'
import { useCliStore } from '@/store/useCliStore'
import './GlobalMasterToolbar.css'

export function GlobalMasterToolbar() {
  const [grandMaster, setGrandMaster] = useState(1.0)
  const [masterSpeed, setMasterSpeed] = useState(1.0)
  const [masterSize, setMasterSize] = useState(1.0)
  const [isPaused, setIsPaused] = useState(false)
  const [isBlackout, setIsBlackout] = useState(false) // Just for local UI state, actual blackout is handled by backend

  const handleGrandMasterChange = (val: number) => {
    setGrandMaster(val)
    window.fixtureAPI.setGrandMaster(val)
    if (val > 0) setIsBlackout(false)
  }

  const handleMasterSpeedChange = (val: number) => {
    setMasterSpeed(val)
    window.dmxAPI.setMasterSpeed(val)
  }

  const handleMasterSizeChange = (val: number) => {
    setMasterSize(val)
    window.dmxAPI.setMasterSize(val)
  }

  const togglePause = () => {
    const next = !isPaused
    setIsPaused(next)
    window.dmxAPI.setAllPaused(next)
  }

  const toggleBlackout = () => {
    if (isBlackout) {
      setIsBlackout(false)
      window.fixtureAPI.setGrandMaster(grandMaster)
    } else {
      setIsBlackout(true)
      window.fixtureAPI.setGrandMaster(0)
    }
  }

  return (
    <div className="global-master-toolbar">
      {/* ── Soft Blackout & Pause All ─────────────────────────────────────── */}
      <div className="toolbar-controls">
        <MidiLearnable action={{ type: 'softBlackout' }} label="Toggle Soft Blackout">
          <button 
            className={`master-btn ${isBlackout ? 'btn-danger' : ''}`}
            onClick={toggleBlackout}
            title="Soft Blackout (Forces all intensity to 0)"
          >
            <Power size={18} />
            <span>Blackout</span>
          </button>
        </MidiLearnable>

        <MidiLearnable action={{ type: 'setAllPaused' }} label="Toggle Pause All">
          <button 
            className={`master-btn ${isPaused ? 'btn-warning' : ''}`}
            onClick={togglePause}
            title="Pause All (Freezes all Chasers and FX)"
          >
            <PauseCircle size={18} />
            <span>Pause All</span>
          </button>
        </MidiLearnable>
      </div>

      <div className="toolbar-divider" />

      {/* ── Grand Master (Intensity) ──────────────────────────────────────── */}
      <div className="master-fader-group">
        <div className="fader-label">
          <Power size={12} /> Grand Master
        </div>
        <MidiLearnable action={{ type: 'setGrandMaster' }} label="Grand Master Fader">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isBlackout ? 0 : grandMaster}
            onChange={(e) => handleGrandMasterChange(parseFloat(e.target.value))}
            className="master-slider grand-master"
            style={{ '--val': isBlackout ? 0 : grandMaster } as React.CSSProperties}
          />
        </MidiLearnable>
        <div className="fader-value">{Math.round((isBlackout ? 0 : grandMaster) * 100)}%</div>
      </div>

      <div className="toolbar-divider" />

      {/* ── Master Speed ──────────────────────────────────────────────────── */}
      <div className="master-fader-group">
        <div className="fader-label">
          <Activity size={12} /> Master Speed
        </div>
        <MidiLearnable action={{ type: 'setMasterSpeed' }} label="Master Speed Fader">
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={masterSpeed}
            onChange={(e) => handleMasterSpeedChange(parseFloat(e.target.value))}
            className="master-slider master-speed"
            style={{ '--val': masterSpeed / 2 } as React.CSSProperties}
          />
        </MidiLearnable>
        <div className="fader-value">{masterSpeed.toFixed(2)}x</div>
      </div>

      <div className="toolbar-divider" />

      {/* ── Master Size ───────────────────────────────────────────────────── */}
      <div className="master-fader-group">
        <div className="fader-label">
          <Maximize2 size={12} /> Master Size
        </div>
        <MidiLearnable action={{ type: 'setMasterSize' }} label="Master Size Fader">
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={masterSize}
            onChange={(e) => handleMasterSizeChange(parseFloat(e.target.value))}
            className="master-slider master-size"
            style={{ '--val': masterSize / 2 } as React.CSSProperties}
          />
        </MidiLearnable>
        <div className="fader-value">{masterSize.toFixed(2)}x</div>
      </div>

      <div className="toolbar-divider" />

      {/* ── Command Line Interface (CLI) ──────────────────────────────────── */}
      <div className="cli-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '0 1rem', justifyContent: 'center' }}>
        <input
          id="global-cli-input"
          type="text"
          placeholder="Command (e.g. 1 THRU 10 @ 50)"
          value={useCliStore(s => s.commandBuffer)}
          onChange={(e) => useCliStore.getState().setCommandBuffer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              useCliStore.getState().executeCommand()
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              useCliStore.getState().navigateHistory('up')
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              useCliStore.getState().navigateHistory('down')
            }
          }}
          className="styled-input"
          style={{ width: '100%', fontFamily: 'monospace', textTransform: 'uppercase', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '4px' }}
        />
        <div style={{ fontSize: '0.75rem', color: 'var(--status-success)', minHeight: '14px', marginTop: '4px' }}>
          {useCliStore(s => s.lastFeedback)}
        </div>
      </div>

    </div>
  )
}
