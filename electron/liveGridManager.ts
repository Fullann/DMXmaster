import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { LiveGridState, GridPages } from '../src/types/grid'
import {
  DEFAULT_GRID_SIZE, GRID_PAGE_COUNT,
  createEmptyPage, createEmptyPages,
} from '../src/types/grid'

// ─────────────────────────────────────────────────────────────────────────────
// LiveGridManager
//
// Owns persistence for the 8-page (8 × 64 cells) Live Busking Grid.
//
// Storage layout (~/Documents/DmxMaster/):
//   LiveGridPages.json — new multi-page format (8 pages, keyed 0-7)
//   LiveGrid.json      — legacy single-page format (auto-migrated to page 0)
// ─────────────────────────────────────────────────────────────────────────────

export class LiveGridManager {
  private appDir   = ''
  private pagesPath = ''
  private legacyPath= ''

  private pages: GridPages = createEmptyPages()

  async initialize(): Promise<void> {
    const docPath  = app.getPath('documents')
    this.appDir    = join(docPath, 'DmxMaster')
    this.pagesPath  = join(this.appDir, 'LiveGridPages.json')
    this.legacyPath = join(this.appDir, 'LiveGrid.json')

    await fs.mkdir(this.appDir, { recursive: true })

    // ── Try new multi-page format first ───────────────────────────────────────
    try {
      const raw    = await fs.readFile(this.pagesPath, 'utf8')
      const parsed = JSON.parse(raw) as GridPages
      this.pages   = this._normalizePagesFromDisk(parsed)
      const assigned = Object.values(this.pages).reduce((s, p) => s + p.filter(c => c.payload).length, 0)
      console.log(`[GridManager] Loaded ${GRID_PAGE_COUNT} pages (${assigned} assignments total).`)
      return
    } catch (e: any) {
      if (e.code !== 'ENOENT') console.warn('[GridManager] Error reading pages file, trying legacy:', e.message)
    }

    // ── Migrate legacy single-page format ─────────────────────────────────────
    try {
      const raw    = await fs.readFile(this.legacyPath, 'utf8')
      const parsed = JSON.parse(raw) as LiveGridState
      if (Array.isArray(parsed) && parsed.length === DEFAULT_GRID_SIZE) {
        this.pages = createEmptyPages()
        this.pages[0] = parsed
        console.log('[GridManager] Migrated legacy LiveGrid.json → page 0.')
        await this._writeToDisk()
        return
      }
    } catch { /* no legacy file, start fresh */ }

    this.pages = createEmptyPages()
    console.log('[GridManager] Initialized with empty 8-page grid.')
  }

  // ── Queries ──────────────────────────────────────────────────────────────────

  getPages(): GridPages {
    return this.pages
  }

  getPage(pageIndex: number): LiveGridState {
    const idx = this._clampPage(pageIndex)
    return this.pages[idx] ?? createEmptyPage()
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  async savePage(pageIndex: number, state: LiveGridState): Promise<void> {
    if (state.length !== DEFAULT_GRID_SIZE) {
      throw new Error(`Invalid grid size. Expected ${DEFAULT_GRID_SIZE}, got ${state.length}.`)
    }
    const idx = this._clampPage(pageIndex)
    this.pages[idx] = state
    await this._writeToDisk()
    console.log(`[GridManager] Saved page ${idx}.`)
  }

  async saveAllPages(pages: GridPages): Promise<void> {
    this.pages = this._normalizePagesFromDisk(pages)
    await this._writeToDisk()
    console.log('[GridManager] Saved all pages.')
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private _clampPage(p: number): number {
    return Math.max(0, Math.min(GRID_PAGE_COUNT - 1, Math.round(p)))
  }

  private async _writeToDisk(): Promise<void> {
    await fs.writeFile(this.pagesPath, JSON.stringify(this.pages, null, 2), 'utf8')
  }

  private _normalizePagesFromDisk(raw: GridPages): GridPages {
    const pages = createEmptyPages()
    for (let p = 0; p < GRID_PAGE_COUNT; p++) {
      const page = raw[p]
      if (Array.isArray(page) && page.length === DEFAULT_GRID_SIZE) {
        pages[p] = page
      }
    }
    return pages
  }
}
