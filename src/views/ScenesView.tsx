import { UndoRedoBar }   from '@/components/scenes/UndoRedoBar'
import { SceneRecorder } from '@/components/scenes/SceneRecorder'
import { BuskingGrid }   from '@/components/scenes/BuskingGrid'
import { useScenesStore } from '@/store/useScenesStore'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useFixturesStore } from '@/store/useFixturesStore'
import type { ParameterGroup } from '@/types/scenes'

export function ScenesView() {
  const sceneState = useScenesStore()
  const history = useHistoryStore()
  
  // Custom save scene handler that hooks into history
  const handleSaveScene = async (name: string, fadeMs: number, filterMask: ParameterGroup, includeFx: boolean) => {
    const states = useFixturesStore.getState().states
    history.push(`Record "${name}"`, states as any)
    await sceneState.saveCurrentAsScene(name, fadeMs, filterMask, includeFx)
  }

  return (
    <div className="view-full" style={{ display: 'flex', flexDirection: 'column' }}>
      <UndoRedoBar
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        lastLabel={history.lastLabel}
        historySize={history.past.length}
        onUndo={history.undo}
        onRedo={history.redo}
      />
      <div className="scenes-view" style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <aside className="scenes-sidebar">
          <div className="panel">
            <SceneRecorder
              onSave={handleSaveScene}
              onClear={sceneState.clearProgrammer}
            />
          </div>
        </aside>
        <main className="scenes-main">
          <div className="section-title" style={{ paddingBottom: '1rem' }}>
            Busking Grid
          </div>
          <div className="busking-scroll">
            <BuskingGrid
              scenes={sceneState.scenes}
              activeId={sceneState.activeId}
              fadeStatus={sceneState.fadeStatus}
              onRecall={sceneState.recallScene}
              onDelete={sceneState.deleteScene}
              onCancelFade={sceneState.cancelFade}
              onClear={sceneState.clearProgrammer}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
