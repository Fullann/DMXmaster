import { ipcMain } from 'electron'
import type { PixelEngine } from '../pixelEngine'
import { handle } from './ipcUtils'

export function registerPixelIpc(pixel: PixelEngine): void {
  // Fire & forget
  ipcMain.on('pixel:updateFrame', (e, id, buf) => { pixel.updateFrame(id, buf as Uint8Array) })
  handle('pixel:getConfig',   ()           => ({ config: pixel.getConfig() }))
  handle('pixel:saveConfig',  (c)       => { pixel.saveConfig(c as any) })
}
