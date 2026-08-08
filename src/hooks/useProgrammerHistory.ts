import { useState, useCallback, useRef } from 'react'
import type { FixtureLogicalState } from '@/types/fixtures'

// ─────────────────────────────────────────────────────────────────────────────
// useProgrammerHistory — 50-state Undo/Redo command stack.
//
// Usage pattern:
//   const { push, undo, redo, canUndo, canRedo, lastLabel } = useProgrammerHistory()
//
//   // Before any mutating action, capture the current programmer state:
//   push('Set Red Night colors', currentStates)
//   await fixtureAPI.sendColor(...)
//
// Undo restores the programmer to the state that was captured just BEFORE
// the action — semantically: "cancel what I just did."
// ─────────────────────────────────────────────────────────────────────────────

const MAX_HISTORY = 50

interface HistoryEntry {
  label:  string
  states: Record<string, Record<string, number>>
}

export function useProgrammerHistory() {
  // past[past.length-1] is the state to restore on undo
  const [past,   setPast]   = useState<HistoryEntry[]>([])
  const [future, setFuture] = useState<HistoryEntry[]>([])
  const [lastLabel, setLastLabel] = useState<string | null>(null)

  // We keep a ref to the current programmer states so we can snapshot them
  // from the caller without needing the hook to own them.
  const currentStatesRef = useRef<Record<string, FixtureLogicalState>>({})

  /** Call this to update the ref whenever fixture states change in the parent */
  const syncStates = useCallback((states: Record<string, FixtureLogicalState>) => {
    currentStatesRef.current = states
  }, [])

  /**
   * Push the current programmer state onto the history stack BEFORE performing
   * a mutating action. This is what gets restored on Undo.
   *
   * @param label   Human-readable description of the action being performed
   * @param states  The programmer state *before* the action (what to restore)
   */
  const push = useCallback((
    label: string,
    states: Record<string, Record<string, number>>,
  ) => {
    setPast(prev => {
      const entry: HistoryEntry = { label, states }
      const next = [...prev, entry]
      // Enforce max size — drop oldest entries
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
    })
    // Clear redo stack whenever a new action is performed
    setFuture([])
    setLastLabel(label)
  }, [])

  /**
   * Undo the most recent action — restores the programmer state that was
   * captured just before that action was applied.
   */
  const undo = useCallback(async () => {
    setPast(prev => {
      if (!prev.length) return prev
      const next = [...prev]
      const entry = next.pop()!

      // Capture current state to push onto future stack
      const currentSnapshot: Record<string, Record<string, number>> = {}
      for (const [id, state] of Object.entries(currentStatesRef.current)) {
        currentSnapshot[id] = { ...state } as Record<string, number>
      }
      setFuture(f => [...f, { label: entry.label, states: currentSnapshot }])
      setLastLabel(`↩ ${entry.label}`)

      // Apply the restored state to the backend (fire-and-forget)
      window.fixtureAPI.setStates(entry.states).catch(console.error)

      return next
    })
  }, [])

  /**
   * Redo — re-applies the state that was undone most recently.
   */
  const redo = useCallback(async () => {
    setFuture(prev => {
      if (!prev.length) return prev
      const next = [...prev]
      const entry = next.pop()!

      // Push current state to past before re-applying
      const currentSnapshot: Record<string, Record<string, number>> = {}
      for (const [id, state] of Object.entries(currentStatesRef.current)) {
        currentSnapshot[id] = { ...state } as Record<string, number>
      }
      setPast(p => {
        const np = [...p, { label: entry.label, states: currentSnapshot }]
        return np.length > MAX_HISTORY ? np.slice(np.length - MAX_HISTORY) : np
      })
      setLastLabel(`↪ ${entry.label}`)

      window.fixtureAPI.setStates(entry.states).catch(console.error)

      return next
    })
  }, [])

  return {
    push,
    undo,
    redo,
    syncStates,
    canUndo:   past.length > 0,
    canRedo:   future.length > 0,
    lastLabel,
    historySize: past.length,
  }
}
