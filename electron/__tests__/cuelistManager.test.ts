import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CuelistManager } from '../cuelistManager'
import type { SceneManager } from '../sceneManager'
import type { Cuelist } from '../../src/types/cuelist'
import * as fs from 'fs'

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

describe('CuelistManager', () => {
  let manager: CuelistManager
  let mockSceneManager: Partial<SceneManager>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    
    mockSceneManager = {
      recallSceneWithFade: vi.fn()
    }
    
    manager = new CuelistManager(mockSceneManager as SceneManager)
    
    // Silence console.error
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should create default cuelist if none exists', async () => {
    vi.mocked(fs.promises.access).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    await manager.init()
    
    const cuelists = manager.getCuelists()
    expect(cuelists).toHaveLength(1)
    expect(cuelists[0].name).toBe('Main Show')
  })

  it('should handle go() and update playback state', async () => {
    const mockCuelists: Cuelist[] = [{
      id: 'list-1',
      name: 'Show',
      cues: [
        { id: 'cue-1', number: 1, name: 'C1', sceneId: 'sc-1', fadeTime: 0, delayTime: 0, trigger: 'manual', followTime: 0 },
        { id: 'cue-2', number: 2, name: 'C2', sceneId: 'sc-2', fadeTime: 0, delayTime: 0, trigger: 'manual', followTime: 0 },
      ]
    }]
    
    vi.mocked(fs.promises.access).mockResolvedValue(undefined)
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockCuelists))
    
    await manager.init()
    
    // State should be stopped initially
    expect(manager.getPlaybackState().state).toBe('stopped')
    
    // Hit GO (Cue 1)
    manager.go('list-1')
    
    expect(mockSceneManager.recallSceneWithFade).toHaveBeenCalledWith('sc-1', 0)
    expect(manager.getPlaybackState().currentCueId).toBe('cue-1')
    expect(manager.getPlaybackState().nextCueId).toBe('cue-2')
    
    // Hit GO (Cue 2)
    manager.go('list-1')
    
    expect(mockSceneManager.recallSceneWithFade).toHaveBeenCalledWith('sc-2', 0)
    expect(manager.getPlaybackState().currentCueId).toBe('cue-2')
    expect(manager.getPlaybackState().nextCueId).toBeNull()
  })

  it('should handle delayTime', async () => {
    const mockCuelists: Cuelist[] = [{
      id: 'list-1',
      name: 'Show',
      cues: [
        { id: 'cue-1', number: 1, name: 'C1', sceneId: 'sc-1', fadeTime: 0, delayTime: 2000, trigger: 'manual', followTime: 0 },
      ]
    }]
    vi.mocked(fs.promises.access).mockResolvedValue(undefined)
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockCuelists))
    
    await manager.init()
    
    manager.go('list-1')
    
    expect(manager.getPlaybackState().state).toBe('waiting')
    expect(mockSceneManager.recallSceneWithFade).not.toHaveBeenCalled()
    
    vi.advanceTimersByTime(2000)
    
    expect(mockSceneManager.recallSceneWithFade).toHaveBeenCalledWith('sc-1', 0)
  })

  it('should handle follow trigger', async () => {
    const mockCuelists: Cuelist[] = [{
      id: 'list-1',
      name: 'Show',
      cues: [
        { id: 'cue-1', number: 1, name: 'C1', sceneId: 'sc-1', fadeTime: 0, delayTime: 0, trigger: 'follow', followTime: 3000 },
        { id: 'cue-2', number: 2, name: 'C2', sceneId: 'sc-2', fadeTime: 0, delayTime: 0, trigger: 'manual', followTime: 0 },
      ]
    }]
    vi.mocked(fs.promises.access).mockResolvedValue(undefined)
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockCuelists))
    
    await manager.init()
    
    manager.go('list-1')
    expect(mockSceneManager.recallSceneWithFade).toHaveBeenCalledWith('sc-1', 0)
    
    // Next cue should not be triggered yet
    expect(mockSceneManager.recallSceneWithFade).toHaveBeenCalledTimes(1)
    
    // Advance followTime
    vi.advanceTimersByTime(3000)
    
    // Next cue should trigger automatically
    expect(mockSceneManager.recallSceneWithFade).toHaveBeenCalledWith('sc-2', 0)
    expect(manager.getPlaybackState().currentCueId).toBe('cue-2')
  })

  it('should stop playback and clear timeouts when stop() is called', async () => {
    const mockCuelists: Cuelist[] = [{
      id: 'list-1',
      name: 'Show',
      cues: [
        { id: 'cue-1', number: 1, name: 'C1', sceneId: 'sc-1', fadeTime: 0, delayTime: 0, trigger: 'follow', followTime: 3000 },
        { id: 'cue-2', number: 2, name: 'C2', sceneId: 'sc-2', fadeTime: 0, delayTime: 0, trigger: 'manual', followTime: 0 },
      ]
    }]
    vi.mocked(fs.promises.access).mockResolvedValue(undefined)
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockCuelists))
    
    await manager.init()
    
    manager.go('list-1')
    
    // Stop playback before follow triggers
    manager.stop()
    vi.advanceTimersByTime(3000)
    
    // Cue 2 should NOT have fired
    expect(mockSceneManager.recallSceneWithFade).toHaveBeenCalledTimes(1)
    expect(manager.getPlaybackState().state).toBe('stopped')
    expect(manager.getPlaybackState().currentCueId).toBeNull()
  })
})
