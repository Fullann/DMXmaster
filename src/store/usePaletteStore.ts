import { create } from 'zustand'
import type { Palette } from '@/types/palette'

interface PaletteStore {
  palettes: Palette[]
  isLoading: boolean
  error: string | null

  loadPalettes: () => Promise<void>
  savePalette: (palette: Partial<Palette>) => Promise<Palette | null>
  deletePalette: (id: string) => Promise<void>
}

export const usePaletteStore = create<PaletteStore>((set, get) => ({
  palettes: [],
  isLoading: false,
  error: null,

  loadPalettes: async () => {
    set({ isLoading: true, error: null })
    const result = await window.paletteAPI.getPalettes()
    if (result.success && result.palettes) {
      set({ palettes: result.palettes, isLoading: false })
    } else {
      set({ error: result.error ?? 'Failed to load palettes', isLoading: false })
    }
  },

  savePalette: async (palette) => {
    set({ isLoading: true, error: null })
    const result = await window.paletteAPI.savePalette(palette)
    if (result.success && result.palette) {
      await get().loadPalettes()
      return result.palette
    } else {
      set({ error: result.error ?? 'Failed to save palette', isLoading: false })
      return null
    }
  },

  deletePalette: async (id) => {
    set({ isLoading: true, error: null })
    const result = await window.paletteAPI.deletePalette(id)
    if (result.success) {
      await get().loadPalettes()
    } else {
      set({ error: result.error ?? 'Failed to delete palette', isLoading: false })
    }
  }
}))
