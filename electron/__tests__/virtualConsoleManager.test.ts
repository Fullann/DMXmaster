import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { VirtualConsoleManager } from '../virtualConsoleManager'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import type { VirtualConsolePage } from '../../src/types/virtualConsole'

vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/userData')
  }
}))

describe('VirtualConsoleManager', () => {
  let manager: VirtualConsoleManager
  const mockPath = '/mock/userData/VirtualConsole.json'

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new VirtualConsoleManager()
  })

  it('should initialize and load default page if no file exists', async () => {
    vi.mocked(fs.promises.access).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    
    await manager.init()
    
    const pages = manager.getPages()
    expect(pages).toHaveLength(1)
    expect(pages[0].name).toBe('Page 1')
    expect(pages[0].widgets).toEqual([])
    
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      mockPath,
      expect.stringContaining('Page 1')
    )
  })

  it('should load pages from file if it exists', async () => {
    vi.mocked(fs.promises.access).mockResolvedValue(undefined)
    
    const mockPages: VirtualConsolePage[] = [
      { id: '1', name: 'Test Page', widgets: [] }
    ]
    
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockPages))
    
    await manager.init()
    
    const pages = manager.getPages()
    expect(pages).toHaveLength(1)
    expect(pages[0].name).toBe('Test Page')
  })

  it('should fallback to default if file contains invalid JSON', async () => {
    vi.mocked(fs.promises.access).mockResolvedValue(undefined)
    vi.mocked(fs.promises.readFile).mockResolvedValue('invalid-json')
    
    await manager.init()
    
    const pages = manager.getPages()
    expect(pages).toHaveLength(1)
    expect(pages[0].name).toBe('Page 1') // Default generated
  })

  it('should save pages and update state', async () => {
    vi.mocked(fs.promises.access).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    await manager.init() // load defaults first

    const newPages: VirtualConsolePage[] = [
      { id: '2', name: 'Saved Page', widgets: [] }
    ]
    
    await manager.savePages(newPages)
    
    expect(manager.getPages()[0].name).toBe('Saved Page')
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      mockPath,
      JSON.stringify(newPages, null, 2)
    )
  })
})
