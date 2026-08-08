import type { AudioEngine } from '../audioEngine'
import { handle } from './ipcUtils'

export function registerAudioIpc(audio: AudioEngine): void {
  handle('audio:updateBands', (e, l, m, h) => { audio.updateBands(l, m, h) })
  handle('audio:addTrigger',  (e, t)       => ({ id: audio.addTrigger(t as any) }))
  handle('audio:removeTrigger',(e, id)     => { audio.removeTrigger(id as string) })
  handle('audio:getTriggers', ()           => ({ triggers: audio.getTriggers() }))
}
