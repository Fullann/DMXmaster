import { useCallback } from 'react'
import type { PatchedFixture, FixtureLogicalState, ChannelType } from '@/types/fixtures'
import { getFixtureCapabilities, hexToRgb, rgbToHex } from '@/types/fixtures'
import { useDmxStore } from '@/store/useDmxStore'
import { Sun, Palette, Circle, Cloud, MoveHorizontal, MoveVertical, Sparkles, Settings2, Disc, Triangle, ZoomIn, Focus } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// LogicalControl — per-fixture smart controls based on channel capabilities.
//
// Renders different controls depending on what the fixture has:
//   • hasRgb       → Color picker  (+ optional White slider)
//   • hasIntensity → Intensity fader
//   • hasSmoke     → Smoke toggle button
//   • hasPanTilt   → Pan & Tilt sliders
//   • hasEffect    → Effect slider
// ─────────────────────────────────────────────────────────────────────────────

interface LogicalControlProps {
  patch:         PatchedFixture[]
  states:        Record<string, FixtureLogicalState>
  onSendCommand: (fixtureId: string, type: ChannelType, value: number) => void
  onSendColor:   (fixtureId: string, r: number, g: number, b: number, w?: number) => void
}

const CHANNEL_COLORS: Record<number, string> = {
  0: 'var(--ch1-color)',
  1: 'var(--ch2-color)',
  2: 'var(--ch3-color)',
  3: 'var(--ch4-color)',
}

export function LogicalControl({ patch, states, onSendCommand, onSendColor }: LogicalControlProps) {
  if (patch.length === 0) {
    return (
      <div className="lc-empty">
        <span>No fixtures patched.</span>
        <span>Go to the <strong>Patch</strong> tab to add fixtures.</span>
      </div>
    )
  }

  const handleSendRaw = useCallback((channel: number, value: number, universeIdx = 0) => {
    useDmxStore.getState().updateChannel(channel, value, universeIdx)
  }, [])

  return (
    <div className="lc-grid">
      {patch.map((fixture, idx) => (
        <FixtureCard
          key={fixture.id}
          fixture={fixture}
          state={states[fixture.id]}
          color={CHANNEL_COLORS[idx % 4]}
          onSendCommand={onSendCommand}
          onSendColor={onSendColor}
          onSendRaw={(ch, val) => handleSendRaw(ch, val, fixture.universeIndex)}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FixtureCard — controls for a single patched fixture
// ─────────────────────────────────────────────────────────────────────────────

interface FixtureCardProps {
  fixture:       PatchedFixture
  state:         FixtureLogicalState | undefined
  color:         string
  onSendCommand: (fixtureId: string, type: ChannelType, value: number) => void
  onSendColor:   (fixtureId: string, r: number, g: number, b: number, w?: number) => void
  onSendRaw:     (channelIndex: number, value: number) => void
}

function FixtureCard({ fixture, state, color, onSendCommand, onSendColor, onSendRaw }: FixtureCardProps) {
  const cap = getFixtureCapabilities(fixture)
  const s   = state ?? { intensity: 0, r: 0, g: 0, b: 0, w: 0, smoke: 0, pan: 128, tilt: 128, shutter: 255, speed: 0, effect: 0, color: 0 }

  const handleColor = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { r, g, b } = hexToRgb(e.target.value)
    onSendColor(fixture.id, r, g, b, s.w)
  }, [fixture.id, s.w, onSendColor])

  const handleSlider = useCallback((type: ChannelType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onSendCommand(fixture.id, type, Number(e.target.value))
  }, [fixture.id, onSendCommand])

  const handleSmokeToggle = useCallback(() => {
    onSendCommand(fixture.id, 'Smoke', s.smoke > 0 ? 0 : 255)
  }, [fixture.id, s.smoke, onSendCommand])

  const currentHex = rgbToHex(s.r, s.g, s.b)

  // Track which channels are already rendered by specialized UI
  const handledTypes = new Set<string>()
  if (cap.hasIntensity) handledTypes.add('Intensity')
  if (cap.hasRgb) { handledTypes.add('Red'); handledTypes.add('Green'); handledTypes.add('Blue') }
  if (cap.hasWhite) handledTypes.add('White')
  if (cap.hasSmoke) handledTypes.add('Smoke')
  if (cap.hasPanTilt) { handledTypes.add('Pan'); handledTypes.add('Tilt') }
  if (cap.hasEffect) handledTypes.add('Effect')
  if (cap.hasGobo) handledTypes.add('Gobo')
  if (cap.hasPrism) handledTypes.add('Prism')
  if (cap.hasZoomFocus) { handledTypes.add('Zoom'); handledTypes.add('Focus') }

  const unhandledChannels = fixture.profile.channels.filter(ch => !handledTypes.has(ch.type))

  return (
    <div className="lc-fixture-card">
      {/* Card header */}
      <div className="lc-card-header">
        <span className="lc-color-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <div className="lc-card-title">
          <span className="lc-label">{fixture.label}</span>
          <span className="lc-address" style={{ color }}>
            CH {String(fixture.startAddress).padStart(3, '0')}
          </span>
        </div>
        <span className="lc-mode-badge">{fixture.profile.mode}</span>
      </div>

      <div className="lc-controls">

        {/* ── Intensity ─────────────────────────────────────────────────────── */}
        {cap.hasIntensity && (
          <div className="lc-control-group">
            <div className="lc-control-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sun size={14} /> <span>Intensity</span>
              <span className="lc-control-value" style={{ marginLeft: 'auto' }}>{s.intensity}</span>
            </div>
            <input
              type="range" min={0} max={255} value={s.intensity}
              className="lc-slider"
              style={{ '--lc-color': color } as React.CSSProperties}
              onChange={handleSlider('Intensity')}
            />
          </div>
        )}

        {/* ── RGB Color Picker ──────────────────────────────────────────────── */}
        {cap.hasRgb && (
          <div className="lc-control-group">
            <div className="lc-control-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={14} /> <span>Color</span>
              <span className="lc-control-value lc-hex" style={{ marginLeft: 'auto' }}>{currentHex.toUpperCase()}</span>
            </div>
            <div className="lc-color-row">
              <input
                id={`color-picker-${fixture.id}`}
                type="color"
                value={currentHex}
                className="lc-color-picker"
                onChange={handleColor}
              />
              <div className="lc-rgb-badges">
                <span>R <strong>{s.r}</strong></span>
                <span>G <strong>{s.g}</strong></span>
                <span>B <strong>{s.b}</strong></span>
              </div>
            </div>

            {/* White channel (RGBW) */}
            {cap.hasWhite && (
              <div className="lc-control-label lc-white-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Circle size={14} /> <span>White</span>
                <span className="lc-control-value" style={{ marginLeft: 'auto' }}>{s.w}</span>
              </div>
            )}
            {cap.hasWhite && (
              <input
                type="range" min={0} max={255} value={s.w}
                className="lc-slider lc-slider-white"
                onChange={e => onSendCommand(fixture.id, 'White', Number(e.target.value))}
              />
            )}
          </div>
        )}

        {/* ── Smoke toggle ──────────────────────────────────────────────────── */}
        {cap.hasSmoke && (
          <div className="lc-control-group">
            <div className="lc-control-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cloud size={14} /> <span>Smoke</span>
            </div>
            <button
              id={`smoke-toggle-${fixture.id}`}
              className={`smoke-toggle ${s.smoke > 0 ? 'active' : ''}`}
              onClick={handleSmokeToggle}
            >
              <span className="smoke-toggle-dot" />
              <span>{s.smoke > 0 ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        )}

        {/* ── Pan / Tilt ────────────────────────────────────────────────────── */}
        {cap.hasPanTilt && (
          <div className="lc-control-group">
            <div className="lc-control-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MoveHorizontal size={14} /> <span>Pan</span>
              <span className="lc-control-value" style={{ marginLeft: 'auto' }}>{s.pan}</span>
            </div>
            <input type="range" min={0} max={255} value={s.pan}
              className="lc-slider"
              style={{ '--lc-color': color } as React.CSSProperties}
              onChange={handleSlider('Pan')}
            />
            <div className="lc-control-label lc-white-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MoveVertical size={14} /> <span>Tilt</span>
              <span className="lc-control-value" style={{ marginLeft: 'auto' }}>{s.tilt}</span>
            </div>
            <input type="range" min={0} max={255} value={s.tilt}
              className="lc-slider"
              style={{ '--lc-color': color } as React.CSSProperties}
              onChange={handleSlider('Tilt')}
            />
          </div>
        )}

        {/* ── Gobo ─────────────────────────────────────────────────────────── */}
        {cap.hasGobo && (
          <div className="lc-control-group">
            <div className="lc-control-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Disc size={14} /> <span>Gobo</span>
              <span className="lc-control-value" style={{ marginLeft: 'auto' }}>{s.gobo}</span>
            </div>
            {/* Generic Gobo Grid (8 buttons mapped to 0, 32, 64, 96...) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginTop: '8px' }}>
              {[0, 32, 64, 96, 128, 160, 192, 224].map((val, idx) => (
                <button
                  key={val}
                  onClick={() => onSendCommand(fixture.id, 'Gobo', val)}
                  style={{
                    background: s.gobo >= val && s.gobo < val + 32 ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    padding: '8px 0',
                    cursor: 'pointer',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px'
                  }}
                  title={`Gobo ${idx === 0 ? 'Open' : idx}`}
                >
                  {idx === 0 ? <Circle size={14} /> : <Disc size={14} opacity={0.5 + (idx * 0.05)} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Prism ────────────────────────────────────────────────────────── */}
        {cap.hasPrism && (
          <div className="lc-control-group">
            <div className="lc-control-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Triangle size={14} /> <span>Prism</span>
              <span className="lc-control-value" style={{ marginLeft: 'auto' }}>{s.prism}</span>
            </div>
            <input type="range" min={0} max={255} value={s.prism}
              className="lc-slider"
              style={{ '--lc-color': color } as React.CSSProperties}
              onChange={handleSlider('Prism')}
            />
          </div>
        )}

        {/* ── Zoom & Focus ─────────────────────────────────────────────────── */}
        {cap.hasZoomFocus && (
          <div className="lc-control-group">
            {fixture.profile.channels.some(c => c.type === 'Zoom') && (
              <>
                <div className="lc-control-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ZoomIn size={14} /> <span>Zoom</span>
                  <span className="lc-control-value" style={{ marginLeft: 'auto' }}>{s.zoom}</span>
                </div>
                <input type="range" min={0} max={255} value={s.zoom}
                  className="lc-slider"
                  style={{ '--lc-color': color } as React.CSSProperties}
                  onChange={handleSlider('Zoom')}
                />
              </>
            )}
            {fixture.profile.channels.some(c => c.type === 'Focus') && (
              <>
                <div className="lc-control-label lc-white-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Focus size={14} /> <span>Focus</span>
                  <span className="lc-control-value" style={{ marginLeft: 'auto' }}>{s.focus}</span>
                </div>
                <input type="range" min={0} max={255} value={s.focus}
                  className="lc-slider"
                  style={{ '--lc-color': color } as React.CSSProperties}
                  onChange={handleSlider('Focus')}
                />
              </>
            )}
          </div>
        )}

        {/* ── Effect ───────────────────────────────────────────────────────── */}
        {cap.hasEffect && (
          <div className="lc-control-group">
            <div className="lc-control-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} /> <span>Effect</span>
              <span className="lc-control-value" style={{ marginLeft: 'auto' }}>{s.effect}</span>
            </div>
            <input type="range" min={0} max={255} value={s.effect}
              className="lc-slider"
              style={{ '--lc-color': 'var(--status-warn)' } as React.CSSProperties}
              onChange={handleSlider('Effect')}
            />
          </div>
        )}

        {/* ── Generic Fallbacks ────────────────────────────────────────────── */}
        {unhandledChannels.length > 0 && (
          <div className="lc-control-group" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="lc-control-label" style={{ marginBottom: '0.5rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Settings2 size={14} /> <span>Extra Channels</span>
            </div>
            {unhandledChannels.map(ch => {
              const isLogical = ['Shutter', 'Strobe', 'Speed', 'Color'].includes(ch.type)
              let val = 0
              if (ch.type === 'Shutter' || ch.type === 'Strobe') val = s.shutter
              else if (ch.type === 'Speed') val = s.speed
              else if (ch.type === 'Color') val = s.color
              else {
                // Unknown/Custom: get raw value if needed, though we don't have it in props. 
                // We'll leave it as uncontrolled or 0 visually if not logical.
              }

              return (
                <div key={ch.number} style={{ marginBottom: '0.5rem' }}>
                  <div className="lc-control-label" style={{ fontSize: '0.75rem' }}>
                    <span>{ch.type} (CH {ch.number})</span>
                    {isLogical && <span className="lc-control-value">{val}</span>}
                  </div>
                  <input type="range" min={0} max={255} 
                    value={isLogical ? val : undefined}
                    defaultValue={!isLogical ? ch.defaultValue : undefined}
                    className="lc-slider"
                    style={{ '--lc-color': '#888', height: '16px' } as React.CSSProperties}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      if (isLogical) {
                        onSendCommand(fixture.id, ch.type, v)
                      } else {
                        // startAddress is 1-indexed. ch.number is 1-indexed. 
                        // DMX channels are 1-indexed in updateChannel.
                        onSendRaw(fixture.startAddress + ch.number - 1, v)
                      }
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
