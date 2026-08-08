import type { SerialManager } from '../serialManager'
import { handle } from './ipcUtils'

export function registerSerialIpc(serial: SerialManager): void {
  handle('dmx:listPorts',   async ()         => ({ ports: await serial.listPorts() }))
  handle('dmx:connect',     async (portPath) => { await serial.connect(portPath as string) })
  handle('dmx:disconnect',  async ()         => { await serial.disconnect() })
}
