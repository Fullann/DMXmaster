import { SubmasterConsole } from '@/components/control/SubmasterConsole'
import { LogicalControl }   from '@/components/fixtures/LogicalControl'
import { useFixturesStore } from '@/store/useFixturesStore'

export function ControlView() {
  const fixtures = useFixturesStore()

  return (
    <div className="view-full" style={{ display: 'flex', flexDirection: 'column' }}>
      <SubmasterConsole />
      <div className="section-title" style={{ padding: '0 1.5rem', paddingTop: '1rem' }}>
        Fixture Controls — {fixtures.patch.length} fixture{fixtures.patch.length !== 1 ? 's' : ''} active
      </div>
      <div className="control-scroll">
        <LogicalControl
          patch={fixtures.patch}
          states={fixtures.states}
          onSendCommand={fixtures.sendCommand}
          onSendColor={fixtures.sendColor}
        />
      </div>
    </div>
  )
}
