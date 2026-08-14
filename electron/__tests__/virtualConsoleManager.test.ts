import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { VirtualConsoleManager } from '../virtualConsoleManager'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import type { VirtualConsolePage } from '../../src/types/virtualConsole'

vi.mock('fs')
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

  it('should initialize and load default page if no file exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    
    manager.init()
    
    const pages = manager.getPages()
    expect(pages).toHaveLength(1)
    expect(pages[0].name).toBe('Page 1')
    expect(pages[0].widgets).toEqual([])
    
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      mockPath,
      expect.stringContaining('Page 1')
    )
  })

  it('should load pages from file if it exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    
    const mockPages: VirtualConsolePage[] = [
      { id: '1', name: 'Test Page', widgets: [] }
    ]
    
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPages))
    
    manager.init()
    
    const pages = manager.getPages()
    expect(pages).toHaveLength(1)
    expect(pages[0].name).toBe('Test Page')
  })

  it('should fallback to default if file contains invalid JSON', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('invalid-json')
    
    manager.init()
    
    const pages = manager.getPages()
    expect(pages).toHaveLength(1)
    expect(pages[0].name).toBe('Page 1') // Default generated
  })

  it('should save pages and update state', () => {
    manager.init()
    
    const newPages: VirtualConsolePage[] = [
      { id: '2', name: 'Saved Page', widgets: [] }
    ]
    
    manager.savePages(newPages)
    
    expect(manager.getPages()[0].name).toBe('Saved Page')
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      mockPath,
      JSON.stringify(newPages, null, 2)
    )
  })
})
