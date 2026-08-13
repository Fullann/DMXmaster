import type { VirtualConsoleManager } from '../virtualConsoleManager'
import type { VirtualConsolePage } from '../../src/types/virtualConsole'
import { handle } from './ipcUtils'

export function registerVirtualConsoleIpc(manager: VirtualConsoleManager): void {
  handle('virtualConsole:getPages', () => ({ pages: manager.getPages() }))
  handle('virtualConsole:savePages', (pages) => {
    manager.savePages(pages as VirtualConsolePage[])
  })
}
