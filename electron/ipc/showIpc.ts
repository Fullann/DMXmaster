import type { ShowManager } from '../showManager'
import { handle } from './ipcUtils'

export function registerShowIpc(show: ShowManager): void {
  handle('app:exportShow', () => show.exportShow())
  handle('app:importShow', () => show.importShow())
  handle('app:newShow',    () => show.newShow())
  handle('app:getRecentShows', () => show.getRecentShows())
  handle('app:openRecentShow', (filePath: string) => show.openRecentShow(filePath))
}
