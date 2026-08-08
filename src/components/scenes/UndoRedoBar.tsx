// ─────────────────────────────────────────────────────────────────────────────
// UndoRedoBar — Slim toolbar for programmer undo/redo.
// ─────────────────────────────────────────────────────────────────────────────

interface UndoRedoBarProps {
  canUndo:     boolean
  canRedo:     boolean
  lastLabel:   string | null
  historySize: number
  onUndo:      () => void
  onRedo:      () => void
}

export function UndoRedoBar({
  canUndo, canRedo, lastLabel, historySize, onUndo, onRedo,
}: UndoRedoBarProps) {
  return (
    <div className="undo-redo-bar">
      <button
        id="btn-undo"
        className={`undo-redo-btn ${canUndo ? 'undo-redo-btn--active' : ''}`}
        onClick={onUndo}
        disabled={!canUndo}
        title={`Undo${canUndo ? ` "${lastLabel}"` : ''} (${historySize} steps)`}
      >
        <span className="undo-redo-icon">↩</span>
        Undo
      </button>

      <button
        id="btn-redo"
        className={`undo-redo-btn ${canRedo ? 'undo-redo-btn--active' : ''}`}
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo"
      >
        <span className="undo-redo-icon">↪</span>
        Redo
      </button>

      {lastLabel && (
        <span className="undo-redo-label">
          <span className="undo-redo-dim">Last:</span> {lastLabel}
        </span>
      )}

      {historySize > 0 && (
        <span className="undo-redo-count">{historySize} / 50</span>
      )}
    </div>
  )
}
