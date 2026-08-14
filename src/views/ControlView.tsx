import { SubmasterConsole } from '@/components/control/SubmasterConsole'
import { LogicalControl }   from '@/components/fixtures/LogicalControl'
import { useFixturesStore } from '@/store/useFixturesStore'
import { GelPicker }        from '@/components/control/GelPicker'
import { getFixtureCapabilities } from '@/types/fixtures'

export function ControlView() {
  const fixtures = useFixturesStore()

  const handleApplyGel = (r: number, g: number, b: number) => {
    fixtures.patch.forEach(fix => {
      const cap = getFixtureCapabilities(fix)
      if (cap.hasRgb) {
        // Algorithme de calcul RGB vers RGBW
        const w = cap.hasWhite ? Math.min(r, g, b) : 0
        const outR = cap.hasWhite ? r - w : r
        const outG = cap.hasWhite ? g - w : g
        const outB = cap.hasWhite ? b - w : b
        
        fixtures.sendColor(fix.id, outR, outG, outB, w)
      }
    })
  }

  return (
    <div className="view-full" style={{ display: 'flex', flexDirection: 'column' }}>
      <SubmasterConsole />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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

        <div style={{ borderLeft: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
          <GelPicker onSelectColor={handleApplyGel} />
        </div>
      </div>
    </div>
  )
}
