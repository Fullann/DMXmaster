import { create } from 'zustand'
import type { VirtualConsolePage, ConsoleWidget } from '@/types/virtualConsole'

interface VirtualConsoleState {
  pages: VirtualConsolePage[]
  activePageId: string | null
  isEditMode: boolean
  
  init: () => Promise<void>
  setEditMode: (edit: boolean) => void
  setActivePage: (id: string) => void
  
  addPage: (name: string) => Promise<void>
  removePage: (id: string) => Promise<void>
  
  addWidget: (pageId: string, widget: Omit<ConsoleWidget, 'id'>) => Promise<void>
  updateWidget: (pageId: string, widgetId: string, updates: Partial<ConsoleWidget>) => Promise<void>
  removeWidget: (pageId: string, widgetId: string) => Promise<void>
}

export const useVirtualConsoleStore = create<VirtualConsoleState>((set, get) => ({
  pages: [],
  activePageId: null,
  isEditMode: false,

  init: async () => {
    const res = await window.virtualConsoleAPI.getPages()
    if (res.success && res.pages) {
      set({ pages: res.pages, activePageId: res.pages[0]?.id || null })
    }
  },

  setEditMode: (edit) => set({ isEditMode: edit }),
  setActivePage: (id) => set({ activePageId: id }),

  addPage: async (name) => {
    const { pages } = get()
    const newPage: VirtualConsolePage = { id: crypto.randomUUID(), name, widgets: [] }
    const newPages = [...pages, newPage]
    set({ pages: newPages, activePageId: newPage.id })
    await window.virtualConsoleAPI.savePages(newPages)
  },

  removePage: async (id) => {
    const { pages, activePageId } = get()
    const newPages = pages.filter(p => p.id !== id)
    set({ 
      pages: newPages, 
      activePageId: activePageId === id ? (newPages[0]?.id || null) : activePageId 
    })
    await window.virtualConsoleAPI.savePages(newPages)
  },

  addWidget: async (pageId, widget) => {
    const { pages } = get()
    const newPages = pages.map(p => {
      if (p.id === pageId) {
        return { ...p, widgets: [...p.widgets, { ...widget, id: crypto.randomUUID() }] }
      }
      return p
    })
    set({ pages: newPages })
    await window.virtualConsoleAPI.savePages(newPages)
  },

  updateWidget: async (pageId, widgetId, updates) => {
    const { pages } = get()
    const newPages = pages.map(p => {
      if (p.id === pageId) {
        return {
          ...p,
          widgets: p.widgets.map(w => w.id === widgetId ? { ...w, ...updates } : w)
        }
      }
      return p
    })
    set({ pages: newPages })
    await window.virtualConsoleAPI.savePages(newPages)
  },

  removeWidget: async (pageId, widgetId) => {
    const { pages } = get()
    const newPages = pages.map(p => {
      if (p.id === pageId) {
        return {
          ...p,
          widgets: p.widgets.filter(w => w.id !== widgetId)
        }
      }
      return p
    })
    set({ pages: newPages })
    await window.virtualConsoleAPI.savePages(newPages)
  }
}))
