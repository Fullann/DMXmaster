import { ipcMain } from 'electron'
import type { PaletteManager } from '../paletteManager'

export function registerPaletteHandlers(paletteManager: PaletteManager) {
  const handle = ipcMain.handle

  handle('palette:getPalettes', () => ({ palettes: paletteManager.getPalettes() }))
  handle('palette:savePalette', async (_e, palette) => ({ palette: await paletteManager.savePalette(palette) }))
  handle('palette:deletePalette', async (_e, id) => {
    await paletteManager.deletePalette(id)
    return { success: true }
  })
}
