import { SubmasterConsole } from '@/components/control/SubmasterConsole'
import { LogicalControl }   from '@/components/fixtures/LogicalControl'
import { useFixturesStore } from '@/store/useFixturesStore'
import { GelPicker }        from '@/components/control/GelPicker'
import { getFixtureCapabilities } from '@/types/fixtures'
import { SlidersHorizontal } from 'lucide-react'

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
    <div className="view-full control-view">
      <div className="control-top">
        <SubmasterConsole />
      </div>
      
      <div className="control-bottom">
        <div className="control-main card">
          <div className="card-header">
            <span className="card-title"><SlidersHorizontal size={16} /> Fixture Controls</span>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              {fixtures.patch.length} fixture{fixtures.patch.length !== 1 ? 's' : ''} active
            </span>
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

        <div className="control-sidebar card">
          <GelPicker onSelectColor={handleApplyGel} />
        </div>
      </div>

      <style>{`
        .control-view {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          overflow: hidden;
        }
        .control-top {
          flex-shrink: 0;
        }
        .control-bottom {
          display: flex;
          gap: var(--space-4);
          flex: 1;
          overflow: hidden;
        }
        .control-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 0;
        }
        .control-main .card-header {
          padding: var(--space-3) var(--space-4);
          border-bottom: 1px solid var(--border);
          background: var(--surface-1);
          border-top-left-radius: var(--radius-md);
          border-top-right-radius: var(--radius-md);
        }
        .control-scroll {
          flex: 1;
          overflow-y: auto;
        }
        .control-sidebar {
          width: 320px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 0;
        }
      `}</style>
    </div>
  )
}
