import { LiveGrid } from '@/components/live/LiveGrid'
import { useLiveGridStore } from '@/store/useLiveGridStore'
import { useScenesStore } from '@/store/useScenesStore'
import { useFxStore } from '@/store/useFxStore'

export function LiveView() {
  const liveGridState = useLiveGridStore()
  const sceneState = useScenesStore()
  const fxState = useFxStore()

  return (
    <div className="view-full" style={{ padding: '2rem', overflowY: 'auto' }}>
      <LiveGrid
        grid={liveGridState.getGrid()}
        activePage={liveGridState.activePage}
        activeNotes={liveGridState.activeNotes}
        scenes={sceneState.scenes}
        effects={fxState.activeEffects}
        onAssign={liveGridState.assignCell}
        onToggle={liveGridState.toggleNote}
        onSwitchPage={liveGridState.switchPage}
      />
    </div>
  )
}
