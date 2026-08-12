import { useCallback } from 'react'
import type { Scene, FadeStatus } from '@/types/scenes'
import { getSceneColor, formatFadeTime } from '@/types/scenes'
import { Clapperboard, Timer, Trash2 } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// BuskingGrid — the scene playback dashboard.
//
// Displays all saved scenes as large, clickable cards in a grid.
// Each card shows:
//   • Scene name
//   • Fade time (formatted)
//   • A progress bar that fills during crossfades (driven by rAF in useScenes)
//   • Active glow when it is the currently recalled scene
//   • Delete button (top-right corner)
// ─────────────────────────────────────────────────────────────────────────────

interface BuskingGridProps {
  scenes:      Scene[]
  activeId:    string | null
  fadeStatus:  FadeStatus
  onRecall:    (id: string) => void
  onDelete:    (id: string) => void
  onCancelFade: () => void
  onClear:      () => void
}

export function BuskingGrid({
  scenes, activeId, fadeStatus, onRecall, onDelete, onCancelFade, onClear
}: BuskingGridProps) {

  if (scenes.length === 0) {
    return (
      <div className="busking-empty">
        <div className="busking-empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent)' }}>
          <Clapperboard size={48} strokeWidth={1.5} />
        </div>
        <div>No scenes recorded yet.</div>
        <div className="busking-empty-hint">
          Use the <strong>Record Scene</strong> panel to capture the current look.
        </div>
      </div>
    )
  }

  return (
    <div className="busking-grid">
      {scenes.map((scene, idx) => (
        <SceneCard
          key={scene.id}
          scene={scene}
          index={idx}
          isActive={activeId === scene.id}
          isFading={fadeStatus.isActive && fadeStatus.sceneId === scene.id}
          fadeProgress={fadeStatus.sceneId === scene.id ? fadeStatus.progress : 0}
          onRecall={onRecall}
          onDelete={onDelete}
          onCancelFade={onCancelFade}
          onClear={onClear}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SceneCard — individual busking button
// ─────────────────────────────────────────────────────────────────────────────

interface SceneCardProps {
  scene:        Scene
  index:        number
  isActive:     boolean
  isFading:     boolean
  fadeProgress: number
  onRecall:     (id: string) => void
  onDelete:     (id: string) => void
  onCancelFade: () => void
  onClear:      () => void
}

function SceneCard({
  scene, index, isActive, isFading, fadeProgress, onRecall, onDelete, onCancelFade, onClear
}: SceneCardProps) {
  const color         = getSceneColor(index)
  const fixtureCount  = Object.keys(scene.fixtureStates).length
  const createdDate   = new Date(scene.createdAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  })

  const handleRecall = useCallback(() => {
    if (isFading) onCancelFade()
    else if (isActive) onClear()
    else onRecall(scene.id)
  }, [isFading, isActive, scene.id, onRecall, onCancelFade, onClear])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(scene.id)
  }, [scene.id, onDelete])

  return (
    <div
      id={`scene-card-${scene.id}`}
      className={`scene-card ${isActive ? 'active' : ''} ${isFading ? 'fading' : ''}`}
      style={{
        '--scene-color': color,
        '--scene-glow':  `${color}40`,
      } as React.CSSProperties}
      onClick={handleRecall}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleRecall()}
      aria-label={`Recall scene: ${scene.name}`}
    >
      {/* Top row: title + delete */}
      <div className="scene-card-top">
        <span className="scene-card-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <button
          className="scene-card-delete"
          onClick={handleDelete}
          title="Delete scene"
          tabIndex={-1}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Name */}
      <div className="scene-card-name">{scene.name}</div>

      {/* Meta row */}
      <div className="scene-card-meta">
        <span className="scene-card-fade">
          {isFading ? (
            <span className="scene-fading-label">FADING…</span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Timer size={12} /> {formatFadeTime(scene.fadeTimeMs)}</span>
          )}
        </span>
        <span className="scene-card-fixtures">{fixtureCount} fix</span>
      </div>

      {/* Recall label (shown on hover) */}
      <div className="scene-card-cta">
        {isFading ? 'CANCEL FADE' : isActive ? 'ACTIVE' : 'RECALL'}
      </div>

      {/* Fade progress bar (bottom of card) */}
      <div className="scene-fade-bar-track">
        <div
          className="scene-fade-bar-fill"
          style={{
            width:      `${fadeProgress * 100}%`,
            background: color,
            boxShadow:  isFading ? `0 0 8px ${color}` : 'none',
          }}
        />
      </div>

      {/* Date badge */}
      <div className="scene-card-date">{createdDate}</div>
    </div>
  )
}
