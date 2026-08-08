import { PatchGrid } from '@/components/fixtures/PatchGrid'
import { useFixturesStore } from '@/store/useFixturesStore'

export function PatchView() {
  const fixtures = useFixturesStore()

  return (
    <div className="view-full patch-view">
      <div className="panel patch-panel">
        <PatchGrid
          profiles={fixtures.profiles}
          patch={fixtures.patch}
          onPatch={fixtures.patchFixture}
          onRemovePatch={fixtures.removePatch}
        />
      </div>
    </div>
  )
}
