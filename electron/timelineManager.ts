import { app } from 'electron'
import { promises as fs } from 'fs'
import { join, basename } from 'path'
import { randomUUID } from 'crypto'
import type { Show } from './timelineTypes'

export class TimelineManager {
  private showsDir = ''

  async initialize(): Promise<void> {
    const docPath = app.getPath('documents')
    this.showsDir = join(docPath, 'DmxMaster', 'Shows')
    
    try {
      await fs.mkdir(this.showsDir, { recursive: true })
      console.log(`[TimelineManager] Shows directory ready at ${this.showsDir}`)
    } catch (e: any) {
      console.error('[TimelineManager] Error creating shows dir:', e.message)
    }
  }

  // ── Show Management ─────────────────────────────────────────────────────────

  async getShows(): Promise<Show[]> {
    try {
      const files = await fs.readdir(this.showsDir)
      const shows: Show[] = []
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(join(this.showsDir, file), 'utf8')
          shows.push(JSON.parse(content))
        }
      }
      return shows
    } catch (e) {
      console.error('[TimelineManager] Error reading shows:', e)
      return []
    }
  }

  async saveShow(show: Show): Promise<void> {
    const filePath = join(this.showsDir, `${show.id}.json`)
    await fs.writeFile(filePath, JSON.stringify(show, null, 2), 'utf8')
  }

  async deleteShow(id: string): Promise<void> {
    const filePath = join(this.showsDir, `${id}.json`)
    await fs.unlink(filePath)
  }

  // ── Audio Import ────────────────────────────────────────────────────────────

  /**
   * Copies an external audio file into the Shows directory so it travels with the project.
   */
  async importAudio(sourcePath: string): Promise<string> {
    const fileName = `${randomUUID()}_${basename(sourcePath)}`
    const destPath = join(this.showsDir, fileName)
    
    await fs.copyFile(sourcePath, destPath)
    return fileName
  }

  /**
   * Returns the absolute file path for an audio file stored in the Shows directory.
   */
  getAudioPath(fileName: string): string {
    return join(this.showsDir, fileName)
  }
}
