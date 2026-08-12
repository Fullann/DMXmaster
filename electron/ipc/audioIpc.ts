import { ipcMain } from 'electron'
import type { AudioEngine } from '../audioEngine'
import { handle } from './ipcUtils'

export function registerAudioIpc(audio: AudioEngine): void {
  ipcMain.on('audio:updateBands', (e, l, m, h) => { audio.updateBands(l, m, h) })
  handle('audio:addTrigger',  (t)       => ({ id: audio.addTrigger(t as any) }))
  handle('audio:removeTrigger',(id)     => { audio.removeTrigger(id as string) })
  handle('audio:getTriggers', ()           => ({ triggers: audio.getTriggers() }))
}
