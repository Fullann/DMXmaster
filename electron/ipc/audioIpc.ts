import { ipcMain } from 'electron'
import type { AudioEngine } from '../audioEngine'
import type { ChaserManager } from '../chaserManager'
import { handle } from './ipcUtils'

export function registerAudioIpc(audio: AudioEngine, chaser: ChaserManager): void {
  ipcMain.on('audio:updateBands', (e, l, m, h) => { audio.updateBands(l, m, h) })
  ipcMain.on('audio:emitBeat', () => { chaser.tapTempo(Date.now()) })
  handle('audio:addTrigger',  (t)       => ({ id: audio.addTrigger(t as any) }))
  handle('audio:removeTrigger',(id)     => { audio.removeTrigger(id as string) })
  handle('audio:getTriggers', ()           => ({ triggers: audio.getTriggers() }))
}
