import { useState, useCallback, useEffect, useRef } from 'react'
import type { LiveGridState, GridCellPayload, GridPages } from '@/types/grid'
import { DEFAULT_GRID_SIZE, GRID_PAGE_COUNT, createEmptyPage, createEmptyPages } from '@/types/grid'
import type { ParsedMidiMessage } from '@/hooks/useMidi'

// ─────────────────────────────────────────────────────────────────────────────
// useLiveGrid — 8-page busking grid hook.
//
// Page structure: pages[0..7], each is a 64-cell LiveGridState.
// The "active page" drives the visible grid and the MIDI Launchpad mapping.
// Switching pages re-syncs all MIDI colors immediately.
// ─────────────────────────────────────────────────────────────────────────────

export function useLiveGrid(
  lastMidiMessage: ParsedMidiMessage | null,
  sendMidiColor:  (note: number, velocity: number) => void,
  triggerScene:   (id: string) => void,
  triggerEffect:  (id: string) => void,
  clearAll:       () => void,
) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [pages,      setPages]      = useState<GridPages>(createEmptyPages())
  const [activePage, setActivePage] = useState(0)
  const [activeNotes,setActiveNotes]= useState<Set<number>>(new Set())
  const [isLoading,  setIsLoading]  = useState(true)

  /** Derived: the current page's 64 cells */
  const grid: LiveGridState = pages[activePage] ?? createEmptyPage()

  // ── Load from backend ──────────────────────────────────────────────────────

  const loadPages = useCallback(async () => {
    setIsLoading(true)
    const res = await window.gridAPI.getPages()
    if (res.success && res.pages) {
      setPages(res.pages)
    } else {
      setPages(createEmptyPages())
    }
    setIsLoading(false)
  }, [])

  useEffect(() => { loadPages() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Page switching ─────────────────────────────────────────────────────────

  const switchPage = useCallback((pageIndex: number) => {
    const idx = Math.max(0, Math.min(GRID_PAGE_COUNT - 1, pageIndex))
    setActivePage(idx)
    setActiveNotes(new Set()) // Clear visual active state on page switch
  }, [])

  // Re-sync MIDI colors whenever the active page changes
  useEffect(() => {
    if (!isLoading) syncAllMidiColors(pages[activePage] ?? createEmptyPage(), activeNotes)
  }, [activePage]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cell Assignment ────────────────────────────────────────────────────────

  const assignCell = useCallback((note: number, payload: GridCellPayload | null, colorVelocity: number) => {
    setPages(prev => {
      const newPages = { ...prev }
      const page = [...(prev[activePage] ?? createEmptyPage())]
      page[note] = { note, payload, colorVelocity }
      newPages[activePage] = page

      // Persist to backend (fire-and-forget)
      window.gridAPI.savePage(activePage, page).catch(console.error)

      // Sync MIDI colors
      syncAllMidiColors(page, activeNotes)

      return newPages
    })
  }, [activePage, activeNotes])

  // ── Execution Logic ────────────────────────────────────────────────────────

  const triggerPayload = useCallback((payload: GridCellPayload | null) => {
    if (!payload) return
    if (payload.type === 'scene') {
      triggerScene(payload.targetId)
    } else if (payload.type === 'fx') {
      triggerEffect(payload.targetId)
    } else if (payload.type === 'command' && payload.targetId === 'clear') {
      clearAll()
      setActiveNotes(new Set())
    }
  }, [triggerScene, triggerEffect, clearAll])

  const toggleNote = useCallback((note: number) => {
    const cell = grid[note]
    if (!cell || !cell.payload) return

    setActiveNotes(prev => {
      const next = new Set(prev)
      const isActive = next.has(note)

      if (isActive) {
        next.delete(note)
        sendMidiColor(note, cell.colorVelocity)
      } else {
        next.add(note)
        sendMidiColor(note, cell.colorVelocity + 2)
        triggerPayload(cell.payload)
      }
      return next
    })
  }, [grid, sendMidiColor, triggerPayload])

  // ── Trigger first-row cell by column (for F1–F8 shortcuts) ─────────────────
  const triggerFirstRow = useCallback((col: number) => {
    // First row = notes 0–7 (row 0, columns 0–7)
    const note = Math.max(0, Math.min(7, col))
    const cell = grid[note]
    if (cell?.payload) {
      triggerPayload(cell.payload)
      setActiveNotes(prev => {
        const next = new Set(prev)
        next.add(note)
        sendMidiColor(note, cell.colorVelocity + 2)
        return next
      })
    }
  }, [grid, triggerPayload, sendMidiColor])

  // ── MIDI Input Sync ────────────────────────────────────────────────────────

  const prevMsgRef = useRef<number>(0)

  useEffect(() => {
    if (!lastMidiMessage) return
    if (lastMidiMessage.timestamp === prevMsgRef.current) return
    prevMsgRef.current = lastMidiMessage.timestamp

    if (lastMidiMessage.type === 'noteOn' && lastMidiMessage.velocity > 0) {
      const note = lastMidiMessage.note
      if (note >= 0 && note < DEFAULT_GRID_SIZE) toggleNote(note)
    }
  }, [lastMidiMessage, toggleNote])

  // ── Full MIDI Color Sync ───────────────────────────────────────────────────

  const syncAllMidiColors = useCallback((currentGrid: LiveGridState, active: Set<number>) => {
    currentGrid.forEach(cell => {
      if (!cell.payload) {
        sendMidiColor(cell.note, 0)
      } else {
        const brightOffset = active.has(cell.note) ? 2 : 0
        sendMidiColor(cell.note, cell.colorVelocity + brightOffset)
      }
    })
  }, [sendMidiColor])

  useEffect(() => {
    if (!isLoading && grid.length > 0) syncAllMidiColors(grid, activeNotes)
  }, [grid, syncAllMidiColors]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    grid,
    pages,
    activePage,
    isLoading,
    activeNotes,
    switchPage,
    assignCell,
    toggleNote,
    triggerFirstRow,
    syncAllMidiColors,
  }
}
