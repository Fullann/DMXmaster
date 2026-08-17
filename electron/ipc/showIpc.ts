import type { ShowManager } from '../showManager'
import type { WebServerManager } from '../webServerManager'
import { handle } from './ipcUtils'
import * as os from 'os'

export function registerShowIpc(show: ShowManager, webServer: WebServerManager): void {
  handle('app:exportShow', () => show.exportShow())
  handle('app:importShow', () => show.importShow())
  handle('app:newShow',    () => show.newShow())
  handle('app:getRecentShows', () => show.getRecentShows())
  handle('app:openRecentShow', (filePath: string) => show.openRecentShow(filePath))
  
  handle('app:getCompanionInfo', () => {
    const interfaces = os.networkInterfaces()
    let ip = '127.0.0.1'
    
    // Find first non-internal IPv4 address
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ip = iface.address
          break
        }
      }
      if (ip !== '127.0.0.1') break
    }

    return {
      token: webServer.getAuthToken(),
      port: 8080,
      ip
    }
  })
}
