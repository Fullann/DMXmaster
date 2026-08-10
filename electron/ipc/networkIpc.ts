import type { NetworkManager } from '../networkManager'
import { handle } from './ipcUtils'

export function registerNetworkIpc(network: NetworkManager): void {
  handle('network:getConfig', ()    => ({ config: network.getConfig() }))
  handle('network:saveConfig',(c) => { network.saveConfig(c as any) })
}
