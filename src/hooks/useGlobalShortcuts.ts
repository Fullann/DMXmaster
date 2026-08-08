import { useEffect, useCallback, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// useGlobalShortcuts — Attaches a single window-level keydown listener that
// handles:
//
//   SPACE     → Global Soft Blackout (intensity channels → 0, non-destructive)
//               A second SPACE (keyup-based hold detection is not needed — each
//               keydown fires one blackout so this is intentionally instant)
//
//   F1–F8     → Trigger the first-row button (col 0–7) on the active grid page
//               (equivalent to pressing the physical Launchpad top row)
//
//   0–7       → Switch the active Live Grid page bank (digit keys)
//
// Guards:
//   - Ignored when focus is inside a text <input>, <textarea>, or [contenteditable]
//     so the user can still type scene names etc. without side effects.
// ─────────────────────────────────────────────────────────────────────────────

interface GlobalShortcutHandlers {
  /** Called on SPACE to fire the intensity-only blackout */
  onSoftBlackout:   () => void
  /** Called on F1-F8 with col index 0-7 */
  onTriggerFirstRow:(col: number) => void
  /** Called on digit 0-7 to switch page banks */
  onSwitchPage:     (page: number) => void
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
}

export function useGlobalShortcuts({
  onSoftBlackout,
  onTriggerFirstRow,
  onSwitchPage,
}: GlobalShortcutHandlers) {
  // Track whether blackout is currently held so we don't repeat-fire on keydown
  const blackoutActive = useRef(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if typing in a form field
    if (isEditableTarget(e.target)) return

    // ── SPACE → Global Soft Blackout ────────────────────────────────────────
    if (e.code === 'Space') {
      e.preventDefault()
      if (!blackoutActive.current) {
        blackoutActive.current = true
        onSoftBlackout()
      }
      return
    }

    // ── F1–F8 → Trigger first-row column 0–7 ───────────────────────────────
    const fMatch = e.code.match(/^F([1-8])$/)
    if (fMatch) {
      e.preventDefault()
      const col = parseInt(fMatch[1], 10) - 1  // F1 → 0, F8 → 7
      onTriggerFirstRow(col)
      return
    }

    // ── Digit 0–7 → Switch page bank ────────────────────────────────────────
    const digitMatch = e.code.match(/^Digit([0-7])$/)
    if (digitMatch) {
      e.preventDefault()
      onSwitchPage(parseInt(digitMatch[1], 10))
      return
    }
  }, [onSoftBlackout, onTriggerFirstRow, onSwitchPage])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      blackoutActive.current = false
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    window.addEventListener('keyup',   handleKeyUp,   { capture: true })
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
      window.removeEventListener('keyup',   handleKeyUp,   { capture: true })
    }
  }, [handleKeyDown, handleKeyUp])
}
