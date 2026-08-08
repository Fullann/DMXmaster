import { AudioDashboard } from '@/components/audio/AudioDashboard'
import { useFixturesStore } from '@/store/useFixturesStore'
import { useFxStore } from '@/store/useFxStore'

export function AudioView() {
  const fixtures = useFixturesStore()
  const fxState = useFxStore()

  return (
    <div className="view-full">
      <AudioDashboard patch={fixtures.patch} effects={fxState.activeEffects} />
    </div>
  )
}
