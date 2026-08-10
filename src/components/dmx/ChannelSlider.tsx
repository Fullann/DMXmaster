import { useRef, useState, useCallback, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// ChannelSlider
//
// A vertical DMX fader (0–255). Performance contract:
//
//  1. Local visual state updates on every input event → zero render lag.
//  2. IPC calls are throttled via requestAnimationFrame so the main process
//     never receives more than ~60 updates/sec regardless of mouse speed.
//  3. The component is "semi-controlled": it accepts an `externalValue` prop
//     and syncs to it only when the user is NOT actively dragging — this
//     allows the parent's universe state to update the slider after e.g. a
//     MIDI note-on or blackout, without fighting the user's hand.
// ─────────────────────────────────────────────────────────────────────────────

interface ChannelSliderProps {
  /** 1-indexed DMX channel number (displayed as label) */
  channel:         number
  /** Human-readable label shown below the fader */
  label?:          string
  /** Colour accent for this channel's glow (CSS colour string) */
  color?:          string
  /** Current value from parent universe state (for external sync) */
  externalValue:   number
  /** Called when the fader value changes (throttled to rAF) */
  onChannelChange: (channel: number, value: number) => void
}

const CHANNEL_COLORS = [
  'var(--ch1-color)',
  'var(--ch2-color)',
  'var(--ch3-color)',
  'var(--ch4-color)',
]

export function ChannelSlider({
  channel,
  label,
  externalValue,
  onChannelChange,
}: ChannelSliderProps) {
  const [localValue, setLocalValue] = useState(externalValue)
  const [isDragging, setIsDragging] = useState(false)

  // Holds the latest value so the rAF callback always reads the freshest one
  const pendingValueRef = useRef(externalValue)
  const rafHandleRef    = useRef<number | null>(null)
  const isDraggingRef   = useRef(false)

  // Keep isDraggingRef in sync with state (ref is safe to read inside rAF)
  useEffect(() => { isDraggingRef.current = isDragging }, [isDragging])

  // Sync from parent (e.g., MIDI note-on → blackout) but only when not dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(externalValue)
      pendingValueRef.current = externalValue
    }
  }, [externalValue, isDragging])

  // ── Throttled IPC dispatch (requestAnimationFrame) ──────────────────────────

  const scheduleDispatch = useCallback(() => {
    if (rafHandleRef.current !== null) return // already scheduled for this frame

    rafHandleRef.current = requestAnimationFrame(() => {
      onChannelChange(channel, pendingValueRef.current)
      rafHandleRef.current = null
    })
  }, [channel, onChannelChange])

  // Cancel pending rAF on unmount
  useEffect(() => {
    return () => {
      if (rafHandleRef.current !== null) {
        cancelAnimationFrame(rafHandleRef.current)
      }
    }
  }, [])

  // ── Event handlers ──────────────────────────────────────────────────────────

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value)
    setLocalValue(newValue)              // instant visual feedback
    pendingValueRef.current = newValue   // update pending value for rAF
    scheduleDispatch()                   // schedule (or reuse) rAF dispatch
  }, [scheduleDispatch])

  const handlePointerDown = useCallback(() => setIsDragging(true), [])
  const handlePointerUp   = useCallback(() => setIsDragging(false), [])

  // ── Display ─────────────────────────────────────────────────────────────────

  const colorIndex    = (channel - 1) % CHANNEL_COLORS.length
  const channelColor  = CHANNEL_COLORS[colorIndex]
  const fillPercent   = (localValue / 255) * 100
  const displayLabel  = label ?? `CH ${channel}`

  return (
    <div className="channel-slider-card" data-channel={channel}>
      {/* Value badge */}
      <div
        className="slider-value-badge"
        style={{ color: channelColor }}
      >
        {localValue}
      </div>

      {/* Fader track area */}
      <div 
        className="slider-track-wrapper"
        style={{ '--fill-pct': `${fillPercent}%` } as React.CSSProperties}
      >
        {/* Level fill bar (decorative, behind the range input) */}
        <div
          className="slider-fill-bar"
          style={{
            height:     `${fillPercent}%`,
            background: channelColor,
            boxShadow:  `0 0 12px ${channelColor}`,
          }}
        />

        {/* The actual input */}
        <input
          id={`channel-slider-${channel}`}
          type="range"
          min={0}
          max={255}
          step={1}
          value={localValue}
          className="slider-input"
          style={{ '--channel-color': channelColor } as React.CSSProperties}
          onChange={handleChange}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          aria-label={`DMX Channel ${channel}`}
          aria-valuemin={0}
          aria-valuemax={255}
          aria-valuenow={localValue}
        />
      </div>

      {/* Channel label */}
      <div className="slider-channel-label">
        <span
          className="slider-channel-dot"
          style={{ background: channelColor, boxShadow: `0 0 6px ${channelColor}` }}
        />
        {displayLabel}
      </div>
    </div>
  )
}
