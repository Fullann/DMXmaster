import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import type { Chaser, ChaserStep, ChaserStatus } from './chaserTypes'
import type { SceneManager } from './sceneManager'

// ─────────────────────────────────────────────────────────────────────────────
// ChaserManager
//
// Responsibilities:
//  1. Disk I/O — reads/writes Chaser JSON from ~/Documents/DmxMaster/Chasers/
//  2. BPM Clock — global BPM (float) that drives step advancement when bpmSync
//     is enabled. Tap Tempo averages the last N taps (client sends tap timestamps).
//  3. Step Loop — runs in the DmxEngine tick() hot path at ~44Hz.
//     Advances through steps, triggering SceneManager.recallScene() with each
//     step's crossfadeMs. When bpmSync = true, the step hold time is derived
//     from the BPM clock; otherwise holdMs is used directly.
// ─────────────────────────────────────────────────────────────────────────────

const TAP_TEMPO_WINDOW = 4 // Average over last N taps

export class ChaserManager {
  private chasersDir  = ''
  private chasers     = new Map<string, Chaser>()

  // ── BPM state ─────────────────────────────────────────────────────────────
  private bpm         = 120.0
  private tapHistory: number[] = [] // Unix ms timestamps of recent taps

  // ── Playback state ────────────────────────────────────────────────────────
  private activeChaser:   Chaser | null = null
  private currentStep     = 0
  private stepElapsedMs   = 0
  private beatAccumulatorMs = 0

  constructor(private readonly sceneManager: SceneManager) {}

  // ── Initialization ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    this.chasersDir = path.join(app.getPath('documents'), 'DmxMaster', 'Chasers')
    await fs.promises.mkdir(this.chasersDir, { recursive: true })
    await this._loadChasers()
    console.log(`[ChaserManager] Loaded ${this.chasers.size} chasers from "${this.chasersDir}"`)
  }

  // ── Disk I/O ────────────────────────────────────────────────────────────────

  private async _loadChasers(): Promise<void> {
    this.chasers.clear()
    const files = await fs.promises.readdir(this.chasersDir)
    for (const file of files.filter(f => f.endsWith('.json'))) {
      try {
        const raw     = await fs.promises.readFile(path.join(this.chasersDir, file), 'utf-8')
        const chaser  = JSON.parse(raw) as Chaser
        this.chasers.set(chaser.id, chaser)
      } catch (err) {
        console.warn(`[ChaserManager] Skipped malformed chaser: ${file}`, err)
      }
    }
  }

  private _writeDebounceTimers = new Map<string, NodeJS.Timeout>()

  private _writeChaserDebounced(chaser: Chaser): void {
    const existing = this._writeDebounceTimers.get(chaser.id)
    if (existing) clearTimeout(existing)

    this._writeDebounceTimers.set(chaser.id, setTimeout(async () => {
      const filePath = path.join(this.chasersDir, `${chaser.id}.json`)
      try {
        await fs.promises.writeFile(filePath, JSON.stringify(chaser, null, 2), 'utf-8')
      } catch (err) {
        console.error(`[ChaserManager] Failed to write chaser ${chaser.id} to disk`, err)
      } finally {
        this._writeDebounceTimers.delete(chaser.id)
      }
    }, 500))
  }

  getChasers(): Chaser[] {
    return Array.from(this.chasers.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }

  getChaser(id: string): Chaser | undefined {
    return this.chasers.get(id)
  }

  async saveChaser(chaser: Chaser): Promise<Chaser> {
    // Assign id + timestamp if new
    if (!chaser.id) chaser.id = randomUUID()
    if (!chaser.createdAt) chaser.createdAt = new Date().toISOString()
    this.chasers.set(chaser.id, chaser)
    this._writeChaserDebounced(chaser)
    return chaser
  }

  async deleteChaser(id: string): Promise<void> {
    const filePath = path.join(this.chasersDir, `${id}.json`)
    try {
      await fs.promises.unlink(filePath)
      this.chasers.delete(id)
      if (this.activeChaser?.id === id) this.stop()
    } catch {
      console.warn(`[ChaserManager] Could not delete chaser: ${id}`)
    }
  }

  // ── Playback ────────────────────────────────────────────────────────────────

  start(chaserId: string): void {
    const chaser = this.chasers.get(chaserId)
    if (!chaser) throw new Error(`Chaser not found: ${chaserId}`)
    if (!chaser.steps.length) throw new Error(`Chaser "${chaser.name}" has no steps.`)

    this.activeChaser       = chaser
    this.currentStep        = 0
    this.stepElapsedMs      = 0
    this.beatAccumulatorMs  = 0

    // Immediately recall step 0
    this._recallCurrentStep()
    console.log(`[ChaserManager] Started chaser "${chaser.name}".`)
  }

  stop(): void {
    if (!this.activeChaser) return
    console.log(`[ChaserManager] Stopped chaser "${this.activeChaser.name}".`)
    this.activeChaser = null
  }

  /** Hot path — called by DmxEngine._tick() at ~44Hz */
  tick(deltaMs: number): void {
    if (!this.activeChaser) return
    const { steps, bpmSync, beatsPerStep } = this.activeChaser

    const stepHoldMs = bpmSync
      ? (60_000 / this.bpm) * beatsPerStep // e.g. 120bpm → 500ms/beat
      : steps[this.currentStep].holdMs

    this.stepElapsedMs += deltaMs

    if (this.stepElapsedMs >= stepHoldMs) {
      this.stepElapsedMs = 0
      this.currentStep = (this.currentStep + 1) % steps.length
      this._recallCurrentStep()
    }
  }

  private _recallCurrentStep(): void {
    if (!this.activeChaser) return
    const step = this.activeChaser.steps[this.currentStep]
    if (!step) return

    try {
      // Use step's crossfadeMs by temporarily overriding the scene fade time
      // We call recallScene which uses the scene's own fadeTimeMs; for per-step
      // control we pass the crossfade value through a dedicated recall path.
      this.sceneManager.recallSceneWithFade(step.sceneId, step.crossfadeMs, step.paletteRefs)
    } catch (err) {
      console.warn(`[ChaserManager] Step ${this.currentStep} recall failed:`, err)
    }
  }

  // ── BPM Clock ────────────────────────────────────────────────────────────────

  getBpm(): number { return this.bpm }

  setBpm(bpm: number): void {
    this.bpm = Math.max(20, Math.min(300, bpm))
    console.log(`[ChaserManager] BPM set to ${this.bpm.toFixed(1)}`)
  }

  /**
   * Records a tap timestamp (Date.now() from the client) and recalculates BPM
   * from the average interval of the last TAP_TEMPO_WINDOW taps.
   */
  tapTempo(nowMs: number): number {
    this.tapHistory.push(nowMs)
    // Keep only the last N+1 entries (N intervals)
    if (this.tapHistory.length > TAP_TEMPO_WINDOW + 1) {
      this.tapHistory.shift()
    }
    if (this.tapHistory.length >= 2) {
      const intervals: number[] = []
      for (let i = 1; i < this.tapHistory.length; i++) {
        intervals.push(this.tapHistory[i] - this.tapHistory[i - 1])
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      this.bpm = Math.max(20, Math.min(300, 60_000 / avgInterval))
    }
    return this.bpm
  }

  // ── Status ──────────────────────────────────────────────────────────────────

  getStatus(): ChaserStatus {
    if (!this.activeChaser) {
      return {
        isRunning: false, chaserId: null, chaserName: null,
        currentStep: 0, totalSteps: 0, bpm: this.bpm, stepProgress: 0,
      }
    }
    const { steps, bpmSync, beatsPerStep } = this.activeChaser
    const stepHoldMs = bpmSync
      ? (60_000 / this.bpm) * beatsPerStep
      : steps[this.currentStep]?.holdMs ?? 500

    return {
      isRunning:    true,
      chaserId:     this.activeChaser.id,
      chaserName:   this.activeChaser.name,
      currentStep:  this.currentStep,
      totalSteps:   steps.length,
      bpm:          this.bpm,
      stepProgress: Math.min(1, this.stepElapsedMs / stepHoldMs),
    }
  }
}
