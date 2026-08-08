import { create } from 'zustand'
import type { LiveGridState, GridCellPayload, GridPages } from '@/types/grid'
import { DEFAULT_GRID_SIZE, GRID_PAGE_COUNT, createEmptyPage, createEmptyPages } from '@/types/grid'
import { useMidiStore } from './useMidiStore'
import { useScenesStore } from './useScenesStore'
import { useFxStore } from './useFxStore'

export interface LiveGridStoreState {
  pages: GridPages
  activePage: number
  activeNotes: Set<number>
  isLoading: boolean
  getGrid: () => LiveGridState

  loadPages: () => Promise<void>
  switchPage: (pageIndex: number) => void
  assignCell: (note: number, payload: GridCellPayload | null, colorVelocity: number) => void
  toggleNote: (note: number) => void
  triggerFirstRow: (col: number) => void
  syncAllMidiColors: (currentGrid: LiveGridState, active: Set<number>) => void
  triggerPayload: (payload: GridCellPayload | null) => void
  clearAll: () => void
  init: () => void
}

export const useLiveGridStore = create<LiveGridStoreState>((set, get) => ({
  pages: createEmptyPages(),
  activePage: 0,
  activeNotes: new Set(),
  isLoading: true,
  getGrid: () => get().pages[get().activePage] ?? createEmptyPage(),

  loadPages: async () => {
    set({ isLoading: true })
    const res = await window.gridAPI.getPages()
    if (res.success && res.pages) {
      set({ pages: res.pages })
    } else {
      set({ pages: createEmptyPages() })
    }
    set({ isLoading: false })
  },

  switchPage: (pageIndex) => {
    const idx = Math.max(0, Math.min(GRID_PAGE_COUNT - 1, pageIndex))
    set({ activePage: idx, activeNotes: new Set() })
    if (!get().isLoading) {
      get().syncAllMidiColors(get().pages[idx] ?? createEmptyPage(), new Set())
    }
  },

  assignCell: (note, payload, colorVelocity) => {
    set((state) => {
      const activePage = state.activePage
      const newPages = { ...state.pages }
      const page = [...(state.pages[activePage] ?? createEmptyPage())]
      page[note] = { note, payload, colorVelocity }
      newPages[activePage] = page

      window.gridAPI.savePage(activePage, page).catch(console.error)
      get().syncAllMidiColors(page, state.activeNotes)

      return { pages: newPages }
    })
  },

  triggerPayload: (payload) => {
    if (!payload) return
    if (payload.type === 'scene') {
      useScenesStore.getState().recallScene(payload.targetId)
    } else if (payload.type === 'fx') {
      // Trigger FX logic could go here, for now it is abstracted or could use a direct call
      // useFxStore.getState().trigger(payload.targetId)
    } else if (payload.type === 'command' && payload.targetId === 'clear') {
      get().clearAll()
    }
  },

  clearAll: () => {
    useScenesStore.getState().clearProgrammer()
    set({ activeNotes: new Set() })
  },

  toggleNote: (note) => {
    const grid = get().getGrid()
    const cell = grid[note]
    if (!cell || !cell.payload) return

    set((state) => {
      const next = new Set(state.activeNotes)
      const isActive = next.has(note)

      if (isActive) {
        next.delete(note)
        useMidiStore.getState().sendMidiColor(note, cell.colorVelocity)
      } else {
        next.add(note)
        useMidiStore.getState().sendMidiColor(note, cell.colorVelocity + 2)
        get().triggerPayload(cell.payload)
      }
      return { activeNotes: next }
    })
  },

  triggerFirstRow: (col) => {
    const note = Math.max(0, Math.min(7, col))
    const grid = get().getGrid()
    const cell = grid[note]
    if (cell?.payload) {
      get().triggerPayload(cell.payload)
      set((state) => {
        const next = new Set(state.activeNotes)
        next.add(note)
        useMidiStore.getState().sendMidiColor(note, cell.colorVelocity + 2)
        return { activeNotes: next }
      })
    }
  },

  syncAllMidiColors: (currentGrid, active) => {
    const sendMidiColor = useMidiStore.getState().sendMidiColor
    currentGrid.forEach(cell => {
      if (!cell.payload) {
        sendMidiColor(cell.note, 0)
      } else {
        const brightOffset = active.has(cell.note) ? 2 : 0
        sendMidiColor(cell.note, cell.colorVelocity + brightOffset)
      }
    })
  },

  init: () => {
    get().loadPages().then(() => {
      const { isLoading, getGrid, activeNotes, syncAllMidiColors } = get()
      if (!isLoading) {
        syncAllMidiColors(getGrid(), activeNotes)
      }
    })
  }
}))
