import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { MatrixFixture, PixelConfig } from './pixelTypes'

export class PixelEngine {
  private configPath = ''
  private config: PixelConfig = { matrices: [] }
  
  // Stores the latest RGB buffer (Uint8Array) received from the frontend for each matrix
  // Key: matrix.id, Value: Uint8Array of length (width * height * 3)
  private buffers: Map<string, Uint8Array> = new Map()

  async initialize(): Promise<void> {
    const docPath = app.getPath('documents')
    const appDir  = join(docPath, 'DmxMaster')
    this.configPath = join(appDir, 'PixelConfig.json')

    try {
      await fs.mkdir(appDir, { recursive: true })
      const data = await fs.readFile(this.configPath, 'utf8')
      const parsed = JSON.parse(data)
      this.config = {
        matrices: parsed.matrices || []
      }
      console.log(`[PixelEngine] Loaded ${this.config.matrices.length} matrices from disk.`)
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        console.error('[PixelEngine] Error loading config:', e.message)
      }
      await this.saveConfig(this.config)
    }
  }

  getConfig(): PixelConfig {
    return this.config
  }

  async saveConfig(cfg: PixelConfig): Promise<void> {
    this.config = cfg
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf8')
    console.log('[PixelEngine] Saved PixelConfig.')
  }

  // ── IPC Receivers ───────────────────────────────────────────────────────────

  /**
   * Called via IPC from the frontend ~30 times a second.
   * buffer is a raw RGB Uint8Array (no Alpha channel) of size width*height*3.
   */
  updateFrame(matrixId: string, buffer: Uint8Array): void {
    this.buffers.set(matrixId, buffer)
  }

  // ── DMX Universe Modification ───────────────────────────────────────────────

  /**
   * Overwrites the universe array with the exact RGB values based on routing math.
   * Called at the very end of DmxEngine._tick().
   */
  applyToUniverse(universe: Uint8Array): void {
    for (const matrix of this.config.matrices) {
      const buffer = this.buffers.get(matrix.id)
      if (!buffer) continue

      // For Phase 10 MVP, we assume the matrix fits within the single active universe.
      // E.g., max 170 pixels per matrix.
      const numPixels = matrix.width * matrix.height
      const maxAllowed = Math.floor((512 - (matrix.startChannel - 1)) / 3)
      const pixelsToRender = Math.min(numPixels, maxAllowed)

      // The frontend buffer is always Linear (left-to-right, top-to-bottom)
      // We must translate (x, y) to the physical LED index based on the routing pattern.
      for (let y = 0; y < matrix.height; y++) {
        for (let x = 0; x < matrix.width; x++) {
          
          const logicalIndex = (y * matrix.width) + x
          if (logicalIndex >= pixelsToRender) continue

          // Get RGB from the frontend buffer
          const bufferOffset = logicalIndex * 3
          const r = buffer[bufferOffset]
          const g = buffer[bufferOffset + 1]
          const b = buffer[bufferOffset + 2]

          // Calculate physical LED index on the WLED strip
          let physicalIndex = 0
          if (matrix.routing === 'Linear') {
            physicalIndex = logicalIndex
          } else if (matrix.routing === 'ZigZag') {
            // Even rows: left to right. Odd rows: right to left.
            if (y % 2 === 0) {
              physicalIndex = (y * matrix.width) + x
            } else {
              physicalIndex = (y * matrix.width) + (matrix.width - 1 - x)
            }
          }

          // Write to the absolute DMX universe
          // startChannel is 1-indexed. Array is 0-indexed.
          const dmxOffset = (matrix.startChannel - 1) + (physicalIndex * 3)
          if (dmxOffset + 2 < 512) {
            universe[dmxOffset]     = r
            universe[dmxOffset + 1] = g
            universe[dmxOffset + 2] = b
          }
        }
      }
    }
  }
}
