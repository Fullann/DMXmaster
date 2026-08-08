import { ChaserEditor } from '@/components/scenes/ChaserEditor'
import { useChaserStore } from '@/store/useChaserStore'
import { useScenesStore } from '@/store/useScenesStore'

export function ChaserView() {
  const chaserState = useChaserStore()
  const sceneState = useScenesStore()

  return (
    <div className="view-full chaser-view">
      <ChaserEditor
        chasers={chaserState.chasers}
        scenes={sceneState.scenes}
        status={chaserState.status}
        onSave={chaserState.saveChaser}
        onDelete={chaserState.deleteChaser}
        onStart={chaserState.startChaser}
        onStop={chaserState.stopChaser}
        onSetBpm={chaserState.setBpm}
        onTapTempo={chaserState.tapTempo}
      />
    </div>
  )
}
