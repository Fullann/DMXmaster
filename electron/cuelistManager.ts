import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import * as crypto from 'crypto'
import type { Cuelist, Cue, CuelistPlaybackState } from '../src/types/cuelist'
import type { SceneManager } from './sceneManager'

export class CuelistManager {
  private cuelistsPath: string
  private cuelists: Cuelist[] = []
  
  private activeCuelistId: string | null = null
  private currentCueId: string | null = null
  private nextCueId: string | null = null
  
  private delayTimeout: NodeJS.Timeout | null = null
  private followTimeout: NodeJS.Timeout | null = null
  
  private updateCallback: ((state: CuelistPlaybackState) => void) | null = null

  constructor(private sceneManager: SceneManager) {
    const userData = app.getPath('userData')
    this.cuelistsPath = path.join(userData, 'Cuelists.json')
  }

  public init() {
    this.load()
  }

  public setUpdateCallback(cb: (state: CuelistPlaybackState) => void) {
    this.updateCallback = cb
  }

  private load() {
    if (fs.existsSync(this.cuelistsPath)) {
      try {
        const data = fs.readFileSync(this.cuelistsPath, 'utf8')
        this.cuelists = JSON.parse(data)
      } catch (err) {
        console.error('Failed to parse Cuelists.json:', err)
        this.createDefault()
      }
    } else {
      this.createDefault()
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.cuelistsPath, JSON.stringify(this.cuelists, null, 2))
    } catch (err) {
      console.error('Failed to save Cuelists.json:', err)
    }
  }

  private createDefault() {
    this.cuelists = [
      {
        id: crypto.randomUUID(),
        name: 'Main Show',
        cues: []
      }
    ]
    this.save()
  }

  public getCuelists(): Cuelist[] {
    return this.cuelists
  }

  public saveCuelists(cuelists: Cuelist[]) {
    this.cuelists = cuelists
    this.save()
  }

  // ── Playback Engine ────────────────────────────────────────────────────────

  public getPlaybackState(): CuelistPlaybackState {
    return {
      activeCuelistId: this.activeCuelistId,
      currentCueId: this.currentCueId,
      nextCueId: this.nextCueId,
      state: (this.delayTimeout || this.followTimeout) ? 'waiting' : (this.currentCueId ? 'fading' : 'stopped')
    }
  }

  private notifyState() {
    if (this.updateCallback) {
      this.updateCallback(this.getPlaybackState())
    }
  }

  private clearTimeouts() {
    if (this.delayTimeout) clearTimeout(this.delayTimeout)
    if (this.followTimeout) clearTimeout(this.followTimeout)
    this.delayTimeout = null
    this.followTimeout = null
  }

  public go(cuelistId: string) {
    this.clearTimeouts()
    const cuelist = this.cuelists.find(c => c.id === cuelistId)
    if (!cuelist || cuelist.cues.length === 0) return

    // If starting a new cuelist or different cuelist
    if (this.activeCuelistId !== cuelistId) {
      this.activeCuelistId = cuelistId
      this.nextCueId = cuelist.cues[0].id
    }

    if (!this.nextCueId) return

    const cueToFire = cuelist.cues.find(c => c.id === this.nextCueId)
    if (!cueToFire) return

    this.fireCue(cuelist, cueToFire)
  }

  private fireCue(cuelist: Cuelist, cue: Cue) {
    // 1. Calculate next cue
    const currentIndex = cuelist.cues.findIndex(c => c.id === cue.id)
    if (currentIndex >= 0 && currentIndex < cuelist.cues.length - 1) {
      this.nextCueId = cuelist.cues[currentIndex + 1].id
    } else {
      this.nextCueId = null
    }

    this.currentCueId = cue.id
    this.notifyState()

    // 2. Handle Delay & Execution
    const execute = () => {
      if (cue.sceneId) {
        try {
          this.sceneManager.recallSceneWithFade(cue.sceneId, cue.fadeTime)
        } catch (e) {
          console.error(`[CuelistManager] Failed to recall scene ${cue.sceneId}`)
        }
      }

      // 3. Handle Follow Trigger
      if (cue.trigger === 'follow') {
        // The follow timer starts AFTER the fade completes, or immediately?
        // In most consoles, follow/wait time starts when the cue is executed.
        this.followTimeout = setTimeout(() => {
          if (this.nextCueId) {
            this.go(cuelist.id)
          }
        }, cue.followTime)
      }
      
      this.notifyState()
    }

    if (cue.delayTime > 0) {
      this.delayTimeout = setTimeout(() => {
        this.delayTimeout = null
        execute()
      }, cue.delayTime)
    } else {
      execute()
    }
  }

  public goto(cuelistId: string, cueId: string) {
    const cuelist = this.cuelists.find(c => c.id === cuelistId)
    if (!cuelist) return
    this.activeCuelistId = cuelistId
    this.nextCueId = cueId
    this.notifyState()
  }

  public stop() {
    this.clearTimeouts()
    this.activeCuelistId = null
    this.currentCueId = null
    this.nextCueId = null
    this.notifyState()
  }
}
