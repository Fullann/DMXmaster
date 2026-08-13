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

  public init() {
    this.load()
  }

  private load() {
    if (fs.existsSync(this.pagesPath)) {
      try {
        const data = fs.readFileSync(this.pagesPath, 'utf8')
        this.pages = JSON.parse(data)
      } catch (err) {
        console.error('Failed to parse VirtualConsole.json:', err)
        this.createDefaultPage()
      }
    } else {
      this.createDefaultPage()
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.pagesPath, JSON.stringify(this.pages, null, 2))
    } catch (err) {
      console.error('Failed to save VirtualConsole.json:', err)
    }
  }

  private createDefaultPage() {
    this.pages = [
      {
        id: crypto.randomUUID(),
        name: 'Page 1',
        widgets: []
      }
    ]
    this.save()
  }

  public getPages(): VirtualConsolePage[] {
    return this.pages
  }

  public savePages(pages: VirtualConsolePage[]) {
    this.pages = pages
    this.save()
  }
}
