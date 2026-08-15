import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import * as crypto from 'crypto'
import type { VirtualConsolePage } from '../src/types/virtualConsole'

export class VirtualConsoleManager {
  private pagesPath: string
  private pages: VirtualConsolePage[] = []

  constructor() {
    const userData = app.getPath('userData')
    this.pagesPath = path.join(userData, 'VirtualConsole.json')
  }

  public async init() {
    await this.load()
  }

  private async load() {
    try {
      await fs.promises.access(this.pagesPath)
      const data = await fs.promises.readFile(this.pagesPath, 'utf8')
      this.pages = JSON.parse(data)
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error('Failed to parse VirtualConsole.json:', err)
      }
      await this.createDefaultPage()
    }
  }

  private async save() {
    try {
      await fs.promises.writeFile(this.pagesPath, JSON.stringify(this.pages, null, 2))
    } catch (err) {
      console.error('Failed to save VirtualConsole.json:', err)
    }
  }

  private async createDefaultPage() {
    this.pages = [
      {
        id: crypto.randomUUID(),
        name: 'Page 1',
        widgets: []
      }
    ]
    await this.save()
  }

  public getPages(): VirtualConsolePage[] {
    return this.pages
  }

  public async savePages(pages: VirtualConsolePage[]) {
    this.pages = pages
    await this.save()
  }
}
