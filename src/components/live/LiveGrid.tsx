import { useState } from 'react'
import type { LiveGridState, GridCellPayload } from '@/types/grid'
import { GRID_PAGE_COUNT } from '@/types/grid'
import type { Scene } from '@/types/scenes'
import type { ActiveEffect } from '@/types/fx'
import { AssignPopover } from './AssignPopover'
import { MidiLearnable } from '@/components/midi/MidiLearnable'

interface LiveGridProps {
  grid:        LiveGridState
  activePage:  number
  activeNotes: Set<number>
  scenes:      Scene[]
  effects:     ActiveEffect[]
  onAssign:    (note: number, payload: GridCellPayload | null, color: number) => void
  onToggle:    (note: number) => void
  onSwitchPage:(page: number) => void
}

// Convert Novation Launchpad velocities to CSS hex colors
function getVelocityColor(velocity: number): string {
  if (velocity === 0) return 'transparent'
  if (velocity >= 13 && velocity <= 15) return '#ef4444' // Red
  if (velocity >= 28 && velocity <= 31) return '#22c55e' // Green
  if (velocity >= 29 && velocity <= 63 && velocity !== 33 && velocity !== 41 && velocity !== 49 && velocity !== 53) return '#f59e0b'
  if (velocity === 33 || velocity === 35) return '#3b82f6'
  if (velocity === 41 || velocity === 43) return '#14b8a6'
  if (velocity === 49 || velocity === 51) return '#a855f7'
  if (velocity === 53 || velocity === 55) return '#ec4899'
  return '#ffffff'
}

export function LiveGrid({
  grid, activePage, activeNotes, scenes, effects,
  onAssign, onToggle, onSwitchPage,
}: LiveGridProps) {
  const [editingNote, setEditingNote] = useState<number | null>(null)

  const handleRightClick = (e: React.MouseEvent, note: number) => {
    e.preventDefault()
    setEditingNote(note)
  }

  return (
    <div className="live-grid-wrapper">

      {/* ── Page Bank Selector ─────────────────────────────────────────────── */}
      <div className="live-grid-banks">
        {Array.from({ length: GRID_PAGE_COUNT }, (_, i) => (
          <button
            key={i}
            className={`grid-bank-btn ${i === activePage ? 'active' : ''}`}
            onClick={() => onSwitchPage(i)}
            title={`Bank ${i + 1}  (keyboard: ${i})`}
          >
            {i + 1}
          </button>
        ))}
        <span className="grid-bank-hint">
          Bank {activePage + 1} / {GRID_PAGE_COUNT} &nbsp;·&nbsp; SPACE = Blackout &nbsp;·&nbsp; F1–F8 = Row 1
        </span>
      </div>

      {/* ── 8×8 Grid ─────────────────────────────────────────────────────── */}
      <div className="live-grid">
        {grid.map(cell => {
          const isActive   = activeNotes.has(cell.note)
          const hasPayload = cell.payload !== null
          const baseColor  = getVelocityColor(cell.colorVelocity)

          let label = ''
          if (hasPayload) {
            if (cell.payload!.type === 'scene') {
              const s = scenes.find(x => x.id === cell.payload!.targetId)
              label   = s ? s.name : 'Unknown Scene'
            } else if (cell.payload!.type === 'fx') {
              label = 'FX'
            } else if (cell.payload!.type === 'command') {
              label = 'Clear'
            }
          }

          return (
            <MidiLearnable 
              key={cell.note}
              action={{ type: 'triggerGridCell', page: activePage, note: cell.note }}
              label={`Trigger Note ${cell.note}`}
            >
              <div
                className={`live-cell ${hasPayload ? 'assigned' : 'empty'} ${isActive ? 'active' : ''}`}
                style={{
                  '--cell-color': baseColor,
                  backgroundColor: isActive ? baseColor : 'rgba(255,255,255,0.03)',
                  borderColor: hasPayload ? baseColor : 'var(--border)',
                  boxShadow: isActive ? `0 0 16px ${baseColor}` : 'none',
                } as React.CSSProperties}
                onClick={() => onToggle(cell.note)}
                onContextMenu={(e) => handleRightClick(e, cell.note)}
              >
                <div className="live-cell-note">{cell.note}</div>
                <div className="live-cell-label">{label}</div>
              </div>
            </MidiLearnable>
          )
        })}
      </div>

      {editingNote !== null && (
        <AssignPopover
          note={editingNote}
          currentPayload={grid[editingNote]?.payload ?? null}
          currentColor={grid[editingNote]?.colorVelocity ?? 0}
          scenes={scenes}
          effects={effects}
          onAssign={onAssign}
          onClose={() => setEditingNote(null)}
        />
      )}
    </div>
  )
}
