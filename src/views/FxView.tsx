import { FxGenerator } from '@/components/fx/FxGenerator'
import { useFxStore } from '@/store/useFxStore'
import { useFixturesStore } from '@/store/useFixturesStore'

export function FxView() {
  const fixtures = useFixturesStore()
  const fxState = useFxStore()

  return (
    <div className="view-full">
      <FxGenerator
        patch={fixtures.patch}
        activeEffects={fxState.activeEffects}
        onAddEffect={fxState.addEffect}
        onUpdateEffect={fxState.updateEffect}
        onSetPaused={fxState.setPaused}
        onRemoveEffect={fxState.removeEffect}
      />
    </div>
  )
}
