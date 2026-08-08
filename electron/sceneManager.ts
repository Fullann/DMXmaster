import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import type { Scene, FadeStatus, FixtureSnapshot, ParameterGroup } from './sceneTypes'
import { PARAMETER_GROUP_KEYS } from './sceneTypes'
import type { FixtureManager } from './fixtureManager'

// ─────────────────────────────────────────────────────────────────────────────
// SceneManager
//
// Three responsibilities:
//  1. Disk I/O — reads/writes Scene JSON from ~/Documents/DmxMaster/Scenes/
//  2. Scene capture — snapshots the current FixtureManager logical state,
//     filtered by a ParameterGroup mask (color-only, position-only, etc.)
//  3. Crossfade playback — called by DmxEngine.tick(deltaMs) at 44Hz.
//     Linearly interpolates logical fixture parameters from source → target
//     over fadeTimeMs, using only the parameters stored in the scene
//     (tracking model: unrelated parameters are not touched).
// ─────────────────────────────────────────────────────────────────────────────

interface ActiveFade {
  scene:        Scene
  /** Captured logical states at the moment recall was triggered */
  sourceStates: Record<string, FixtureSnapshot>
  elapsedMs:    number
}

export class SceneManager {
  private scenesDir = ''
  private scenes    = new Map<string, Scene>()
  private activeFade: ActiveFade | null = null

  constructor(private readonly fixtureManager: FixtureManager) {}

  // ── Initialization ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    this.scenesDir = path.join(app.getPath('documents'), 'DmxMaster', 'Scenes')
    await fs.promises.mkdir(this.scenesDir, { recursive: true })
    await this.loadScenes()
    console.log(`[SceneManager] Loaded ${this.scenes.size} scenes from "${this.scenesDir}"`)
  }

  // ── Disk I/O ────────────────────────────────────────────────────────────────

  async loadScenes(): Promise<void> {
    this.scenes.clear()
    const files = await fs.promises.readdir(this.scenesDir)
    for (const file of files.filter(f => f.endsWith('.json'))) {
      try {
        const raw   = await fs.promises.readFile(path.join(this.scenesDir, file), 'utf-8')
        const scene = JSON.parse(raw) as Scene
        // Backwards-compat: legacy scenes without filterMask default to 'all'
        if (!scene.filterMask) scene.filterMask = 'all'
        this.scenes.set(scene.id, scene)
      } catch (err) {
        console.warn(`[SceneManager] Skipped malformed scene: ${file}`, err)
      }
    }
  }

  private async _writeScene(scene: Scene): Promise<void> {
    const filePath = path.join(this.scenesDir, `${scene.id}.json`)
    await fs.promises.writeFile(filePath, JSON.stringify(scene, null, 2), 'utf-8')
  }

  async deleteScene(id: string): Promise<void> {
    const filePath = path.join(this.scenesDir, `${id}.json`)
    try {
      await fs.promises.unlink(filePath)
      this.scenes.delete(id)
      // Cancel fade if this scene was recalling
      if (this.activeFade?.scene.id === id) this.activeFade = null
    } catch {
      console.warn(`[SceneManager] Could not delete scene: ${id}`)
    }
  }

  // ── Scene capture ────────────────────────────────────────────────────────────

  /**
   * Captures the current logical state of all patched fixtures, filtered by
   * `filterMask`, and saves it as a new Scene.
   *
   * @param name        Scene display name
   * @param fadeTimeMs  Linear crossfade duration (0 = snap)
   * @param filterMask  Which parameter group to capture ('all' | 'color' | ...)
   */
  async saveCurrentAsScene(
    name:        string,
    fadeTimeMs:  number,
    filterMask:  ParameterGroup = 'all',
  ): Promise<Scene> {
    const patch     = this.fixtureManager.getPatch()
    const allStates = this.fixtureManager.getFixtureStates()
    const allowedKeys = PARAMETER_GROUP_KEYS[filterMask]

    const fixtureStates: Record<string, FixtureSnapshot> = {}
    for (const fixture of patch) {
      const state = allStates[fixture.id]
      if (!state) continue

      // Build a pruned snapshot containing only the allowed parameter keys
      const snapshot: FixtureSnapshot = {}
      for (const key of allowedKeys) {
        if (key in state) {
          (snapshot as Record<string, number>)[key] = (state as Record<string, number>)[key]
        }
      }
      fixtureStates[fixture.id] = snapshot
    }

    const scene: Scene = {
      id:            randomUUID(),
      name:          name.trim() || 'Unnamed Scene',
      fadeTimeMs:    Math.max(0, fadeTimeMs),
      fixtureStates,
      createdAt:     new Date().toISOString(),
      filterMask,
    }

    this.scenes.set(scene.id, scene)
    await this._writeScene(scene)
    console.log(`[SceneManager] Saved scene "${scene.name}" (mask: ${filterMask}, ${Object.keys(fixtureStates).length} fixture(s)).`)
    return scene
  }

  // ── Recall & Crossfade ───────────────────────────────────────────────────────

  /**
   * Triggers a scene recall using the scene's own fadeTimeMs.
   * Only parameters present in the scene's fixtureStates are affected —
   * unrelated parameters (e.g., Pan/Tilt in a colour-only scene) are left intact.
   */
  recallScene(sceneId: string): void {
    const scene = this.scenes.get(sceneId)
    if (!scene) throw new Error(`Scene not found: ${sceneId}`)
    this._startRecall(scene, scene.fadeTimeMs)
  }

  /**
   * Recall a scene with an explicit crossfade duration override.
   * Used by ChaserManager to apply per-step crossfade times regardless of
   * the scene's stored fadeTimeMs.
   */
  recallSceneWithFade(sceneId: string, overrideFadeMs: number): void {
    const scene = this.scenes.get(sceneId)
    if (!scene) throw new Error(`Scene not found: ${sceneId}`)
    this._startRecall(scene, overrideFadeMs)
  }

  private _startRecall(scene: Scene, fadeMs: number): void {
    // Snap to target if no fade time
    if (fadeMs <= 0) {
      for (const [fixtureId, snapshot] of Object.entries(scene.fixtureStates)) {
        this.fixtureManager.setLogicalState(fixtureId, snapshot)
      }
      this.activeFade = null
      console.log(`[SceneManager] Recalled "${scene.name}" (snap).`)
      return
    }

    // Capture current state as fade source
    const allStates  = this.fixtureManager.getFixtureStates()
    const sourceStates: Record<string, FixtureSnapshot> = {}

    for (const fixtureId of Object.keys(scene.fixtureStates)) {
      const current = allStates[fixtureId]
      if (current) sourceStates[fixtureId] = { ...current }
    }

    // Build a virtual scene copy with the overridden fade time
    const virtualScene: Scene = { ...scene, fadeTimeMs: fadeMs }
    this.activeFade = { scene: virtualScene, sourceStates, elapsedMs: 0 }
    console.log(`[SceneManager] Recalling "${scene.name}" over ${fadeMs}ms.`)
  }


  /**
   * Hot path — called by DmxEngine._tick() at ~44Hz.
   * Advances the active crossfade by deltaMs and writes interpolated values
   * into the FixtureManager's logical state.
   */
  tick(deltaMs: number): void {
    if (!this.activeFade) return

    this.activeFade.elapsedMs += deltaMs
    const { scene, sourceStates, elapsedMs } = this.activeFade

    // Linear interpolation parameter t ∈ [0, 1]
    const t = Math.min(1, elapsedMs / scene.fadeTimeMs)

    for (const [fixtureId, targetSnapshot] of Object.entries(scene.fixtureStates)) {
      const source  = sourceStates[fixtureId] ?? {}
      const updates: Record<string, number> = {}

      for (const [key, targetVal] of Object.entries(targetSnapshot)) {
        const sourceVal = (source as Record<string, number>)[key] ?? 0
        updates[key] = Math.round(sourceVal + (targetVal - sourceVal) * t)
      }

      this.fixtureManager.setLogicalState(fixtureId, updates)
    }

    if (t >= 1) {
      console.log(`[SceneManager] Fade complete: "${scene.name}".`)
      this.activeFade = null
    }
  }

  // ── Queries ─────────────────────────────────────────────────────────────────

  getScenes(): Scene[] {
    return Array.from(this.scenes.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }

  getScene(id: string): Scene | undefined {
    return this.scenes.get(id)
  }

  getFadeStatus(): FadeStatus {
    if (!this.activeFade) {
      return { isActive: false, sceneId: null, sceneName: null, fadeTimeMs: 0, elapsedMs: 0, progress: 0 }
    }
    const { scene, elapsedMs } = this.activeFade
    return {
      isActive:   true,
      sceneId:    scene.id,
      sceneName:  scene.name,
      fadeTimeMs: scene.fadeTimeMs,
      elapsedMs,
      progress:   Math.min(1, elapsedMs / scene.fadeTimeMs),
    }
  }

  cancelFade(): void {
    if (this.activeFade) {
      console.log(`[SceneManager] Cancelled fade: "${this.activeFade.scene.name}".`)
      this.activeFade = null
    }
  }
}
