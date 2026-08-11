import { app } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { randomUUID } from 'crypto'
import type { Palette } from './paletteTypes'

export class PaletteManager {
  private palettesDir = ''
  private palettes = new Map<string, Palette>()

  async initialize(): Promise<void> {
    this.palettesDir = path.join(app.getPath('documents'), 'DmxMaster', 'Palettes')
    await fs.mkdir(this.palettesDir, { recursive: true })
    await this.loadPalettes()
    console.log(`[PaletteManager] Loaded ${this.palettes.size} palettes from "${this.palettesDir}"`)
  }

  async loadPalettes(): Promise<void> {
    this.palettes.clear()
    try {
      const files = await fs.readdir(this.palettesDir)
      for (const file of files) {
        if (!file.endsWith('.json')) continue
        const fullPath = path.join(this.palettesDir, file)
        const content = await fs.readFile(fullPath, 'utf8')
        try {
          const palette: Palette = JSON.parse(content)
          this.palettes.set(palette.id, palette)
        } catch (err) {
          console.error(`[PaletteManager] Failed to parse ${file}:`, err)
        }
      }
    } catch (err) {
      console.error('[PaletteManager] Error reading palettes directory:', err)
    }
  }

  getPalettes(): Palette[] {
    return Array.from(this.palettes.values())
  }

  getPalette(id: string): Palette | undefined {
    return this.palettes.get(id)
  }

  async savePalette(palette: Omit<Palette, 'id'> & { id?: string }): Promise<Palette> {
    const isNew = !palette.id
    const id = palette.id || randomUUID()
    const fullPalette: Palette = { ...palette, id }

    this.palettes.set(id, fullPalette)
    const filePath = path.join(this.palettesDir, `${id}.json`)
    await fs.writeFile(filePath, JSON.stringify(fullPalette, null, 2), 'utf8')
    console.log(`[PaletteManager] Saved palette "${fullPalette.name}" (${id})`)
    return fullPalette
  }

  async deletePalette(id: string): Promise<void> {
    if (this.palettes.has(id)) {
      this.palettes.delete(id)
      const filePath = path.join(this.palettesDir, `${id}.json`)
      try {
        await fs.unlink(filePath)
        console.log(`[PaletteManager] Deleted palette (${id})`)
      } catch (err) {
        console.warn(`[PaletteManager] Could not delete file for palette ${id}:`, err)
      }
    }
  }
}
