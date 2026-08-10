import { ipcMain } from 'electron'
import type { TimelineManager } from '../timelineManager'
import { handle } from './ipcUtils'

export function registerTimelineIpc(timeline: TimelineManager): void {
  handle('timeline:getShows',   ()       => timeline.getShows().then(s => ({ shows: s })))
  handle('timeline:saveShow',   (s)   => timeline.saveShow(s as any).then(() =>({})))
  handle('timeline:deleteShow', (id)  => timeline.deleteShow(id as string).then(() =>({})))
  handle('timeline:importAudio',(p)   => timeline.importAudio(p as string).then(f => ({ fileName: f })))
  
  ipcMain.handle('timeline:getAudioBuffer', async (fileName: string) => {
    try {
      const p = timeline.getAudioPath(fileName)
      const fs = require('fs')
      const buffer = fs.readFileSync(p)
      return { success: true, buffer: buffer.buffer } // return raw ArrayBuffer
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
