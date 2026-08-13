import type { CuelistManager } from '../cuelistManager'
import type { Cuelist } from '../../src/types/cuelist'
import { handle } from './ipcUtils'
import { BrowserWindow } from 'electron'

export function registerCuelistIpc(manager: CuelistManager): void {
  handle('cuelist:getAll', () => ({ cuelists: manager.getCuelists() }))
  handle('cuelist:save', (cuelists) => {
    manager.saveCuelists(cuelists as Cuelist[])
  })
  
  handle('cuelist:go', (cuelistId) => {
    manager.go(cuelistId as string)
  })
  handle('cuelist:stop', () => {
    manager.stop()
  })
  handle('cuelist:goto', ({ cuelistId, cueId }) => {
    manager.goto(cuelistId as string, cueId as string)
  })

  // Whenever playback state changes, push it to all renderer windows
  manager.setUpdateCallback((state) => {
    BrowserWindow.getAllWindows().forEach(w => {
      w.webContents.send('cuelist:playbackState', state)
    })
  })
}
