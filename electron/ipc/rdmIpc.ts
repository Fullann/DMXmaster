import { ipcMain } from 'electron'
import type { RdmManager } from '../rdmManager'

export function registerRdmIpc(rdmManager: RdmManager) {
  // Enregistre les appels du renderer
  ipcMain.handle('rdm:discover', async () => {
    await rdmManager.discoverDevices()
    return { success: true }
  })

  ipcMain.handle('rdm:setAddress', async (_e, uid: string, newAddress: number) => {
    const success = await rdmManager.setDmxAddress(uid, newAddress)
    return { success }
  })

  ipcMain.handle('rdm:getDevices', () => {
    return { success: true, devices: rdmManager.getDevices() }
  })
}
