import { useState } from 'react'
import type { GridCellPayload, PayloadType } from '@/types/grid'
import type { Scene } from '@/types/scenes'
import type { ActiveEffect } from '@/types/fx'

export interface AssignPopoverProps {
  note: number
  currentPayload: GridCellPayload | null
  currentColor: number
  scenes: Scene[]
  effects: ActiveEffect[]
  onAssign: (note: number, payload: GridCellPayload | null, color: number) => void
  onClose: () => void
}

// Standard Launchpad Colors (dim values, bright is usually +2)
const COLORS = [
  { label: 'Red',    value: 13, hex: '#ef4444' },
  { label: 'Amber',  value: 29, hex: '#f59e0b' },
  { label: 'Yellow', value: 45, hex: '#eab308' },
  { label: 'Green',  value: 28, hex: '#22c55e' },
  { label: 'Mint',   value: 41, hex: '#14b8a6' },
  { label: 'Blue',   value: 33, hex: '#3b82f6' },
  { label: 'Purple', value: 49, hex: '#a855f7' },
  { label: 'Pink',   value: 53, hex: '#ec4899' },
]

export function AssignPopover({ note, currentPayload, currentColor, scenes, effects, onAssign, onClose }: AssignPopoverProps) {
  const [type, setType] = useState<PayloadType | 'none'>(currentPayload ? currentPayload.type : 'none')
  const [targetId, setTargetId] = useState<string>(currentPayload ? currentPayload.targetId : '')
  const [color, setColor] = useState<number>(currentColor || COLORS[0].value)

  const handleSave = () => {
    if (type === 'none') {
      onAssign(note, null, 0)
    } else {
      let finalTarget = targetId
      if (type === 'scene' && !targetId && scenes.length > 0) finalTarget = scenes[0].id
      if (type === 'fx' && !targetId && effects.length > 0) finalTarget = effects[0].id
      if (type === 'command') finalTarget = 'clear'

      onAssign(note, { type, targetId: finalTarget }, color)
    }
    onClose()
  }

  return (
    <div className="grid-popover-overlay" onClick={onClose}>
      <div className="grid-popover" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <span className="panel-title">Assign Pad {note}</span>
        </div>

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label">Action Type</label>
          <select className="styled-input" value={type} onChange={e => setType(e.target.value as any)}>
            <option value="none">Empty</option>
            <option value="scene">Trigger Scene</option>
            <option value="fx">Trigger Effect</option>
            <option value="command">Special Command</option>
          </select>
        </div>

        {type === 'scene' && (
          <div className="form-group">
            <label className="form-label">Select Scene</label>
            <select className="styled-input" value={targetId} onChange={e => setTargetId(e.target.value)}>
              <option value="" disabled>-- Select a Scene --</option>
              {scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {type === 'fx' && (
          <div className="form-group">
            <label className="form-label">Select Active Effect</label>
            <select className="styled-input" value={targetId} onChange={e => setTargetId(e.target.value)}>
              <option value="" disabled>-- Select an Effect --</option>
              {effects.map(fx => <option key={fx.id} value={fx.id}>{fx.config.shape} on {fx.config.target}</option>)}
            </select>
          </div>
        )}

        {type === 'command' && (
          <div className="form-group">
            <label className="form-label">Command</label>
            <select className="styled-input" value={targetId} onChange={e => setTargetId(e.target.value)}>
              <option value="clear">Clear Programmer</option>
            </select>
          </div>
        )}

        {type !== 'none' && (
          <div className="form-group">
            <label className="form-label">Pad Color</label>
            <div className="color-picker-row">
              {COLORS.map(c => (
                <div
                  key={c.value}
                  className={`color-swatch ${color === c.value ? 'selected' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => setColor(c.value)}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        )}

        <div className="popover-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
