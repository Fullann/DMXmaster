import type { LiveGridManager } from '../liveGridManager'
import { handle } from './ipcUtils'

export function registerGridIpc(grid: LiveGridManager): void {
  handle('grid:getPages',   ()                   => ({ pages: grid.getPages() }))
  handle('grid:getPage',    (pageIdx)             => ({ page: grid.getPage(pageIdx as number) }))
  handle('grid:savePage',   async (pageIdx, cfg)  => { await grid.savePage(pageIdx as number, cfg as any) })
  handle('grid:saveAll',    async (pages)          => { await grid.saveAllPages(pages as any) })

  // Legacy single-page compat (used by old saves)
  handle('grid:get',  ()      => ({ grid: grid.getPage(0) }))
  handle('grid:save', async (cfg) => { await grid.savePage(0, cfg as any) })
}
