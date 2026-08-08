import type { ChaserManager } from '../chaserManager'
import type { Chaser } from '../chaserTypes'
import { handle } from './ipcUtils'

export function registerChaserIpc(chaser: ChaserManager): void {
  handle('chaser:getChasers',  ()       => ({ chasers: chaser.getChasers() }))
  handle('chaser:getChaser',   (id)     => {
    const c = chaser.getChaser(id as string)
    if (!c) throw new Error(`Chaser not found: ${id}`)
    return { chaser: c }
  })
  handle('chaser:saveChaser',  async (c) => ({ chaser: await chaser.saveChaser(c as Chaser) }))
  handle('chaser:deleteChaser',async (id) => { await chaser.deleteChaser(id as string) })
  handle('chaser:start',       (id)     => { chaser.start(id as string) })
  handle('chaser:stop',        ()       => { chaser.stop() })
  handle('chaser:setBpm',      (bpm)    => { chaser.setBpm(bpm as number) })
  handle('chaser:tapTempo',    (nowMs)  => ({ bpm: chaser.tapTempo(nowMs as number) }))
  handle('chaser:getStatus',   ()       => ({ status: chaser.getStatus() }))
}
