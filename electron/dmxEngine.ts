import type { SerialManager } from './serialManager'
import type { AudioEngine } from './audioEngine'
import type { NetworkManager } from './networkManager'
import type { PixelEngine } from './pixelEngine'
import { MAX_UNIVERSES } from './networkTypes'

// Duck-typed interfaces — avoids direct imports (no circular deps)
interface MultiUniverseProcessor {
  applyToUniverses(universes: Uint8Array[], offsets?: Record<string, Record<string, number>>): void
}

interface SceneTick {
  tick(deltaMs: number): void
}

interface FxEngineTick {
  tick(deltaMs: number): void
  getOffsets(): Record<string, Record<string, number>>
}

interface ChaserTick {
  tick(deltaMs: number): void
}

// ─────────────────────────────────────────────────────────────────────────────
// DmxEngine
//
// The core DMX universe engine. Manages MAX_UNIVERSES (8) independent 512-
// channel universes and transmits them via Enttec DMX USB Pro (universe 0
// on the physical port) and Art-Net (all universes to configured nodes).
//
// Adaptive Framerate:
//   • Full rate:  ~44Hz — used whenever any universe is live.
//   • Idle rate:  ~5Hz  — drops after 1 s of no changes across ALL universes.
//   • Wake-up:  Any channel change instantly re-arms 44Hz.
// ─────────────────────────────────────────────────────────────────────────────

const RATE_FULL_MS      = Math.round(1000 / 44)  // ≈22ms
const RATE_IDLE_MS      = Math.round(1000 / 5)   // 200ms
const IDLE_THRESHOLD_MS = 1_000

/** Enttec DMX USB Pro packet constants */
const ENTTEC_START_OF_MSG = 0x7e
const ENTTEC_END_OF_MSG   = 0xe7
const ENTTEC_OUTPUT_LABEL = 0x06
const DMX_START_CODE      = 0x00
const DMX_CHANNELS        = 512
const PACKET_DATA_LENGTH  = DMX_CHANNELS + 1

// Pre-allocated Enttec packet (universe 0 only — serial port is single-universe)
const PACKET_SIZE  = 5 + DMX_CHANNELS + 1        // 519 bytes
const packetBuffer = Buffer.allocUnsafe(PACKET_SIZE)
packetBuffer[0] = ENTTEC_START_OF_MSG
packetBuffer[1] = ENTTEC_OUTPUT_LABEL
packetBuffer[2] = PACKET_DATA_LENGTH & 0xff
packetBuffer[3] = (PACKET_DATA_LENGTH >> 8) & 0xff
packetBuffer[4] = DMX_START_CODE
packetBuffer[517] = ENTTEC_END_OF_MSG

// ─────────────────────────────────────────────────────────────────────────────

export class DmxEngine {
  /**
   * Live universe buffers [0..MAX_UNIVERSES-1].
   * Index 0 is also sent to the physical Enttec serial port.
   */
  private readonly universes: Uint8Array[] = Array.from(
    { length: MAX_UNIVERSES },
    () => new Uint8Array(DMX_CHANNELS),
  )

  /** Shadow buffers for adaptive-rate change detection */
  private readonly prevUniverses: Uint8Array[] = Array.from(
    { length: MAX_UNIVERSES },
    () => new Uint8Array(DMX_CHANNELS),
  )

  private loopTimer: ReturnType<typeof setInterval> | null = null
  private currentIntervalMs = RATE_FULL_MS
  private lastChangedMs     = 0
  private isIdle            = false
  private lastTickMs        = 0

  // Global Masters
  private masterSpeed       = 1.0
  private masterSize        = 1.0
  private allPaused         = false

  // Bypass intelligent engine to allow raw DMX control from Dashboard
  public engineBypassed: boolean = false

  // ── Blind Mode State ────────────────────────────────────────────────────────
  private isBlindMode = false
  private blindUnfadeMs = 0
  private blindUnfadeElapsedMs = 0
  
  private readonly frozenUniverses: Uint8Array[] = Array.from(
    { length: MAX_UNIVERSES },
    () => new Uint8Array(DMX_CHANNELS)
  )
  
  private readonly outputUniverses: Uint8Array[] = Array.from(
    { length: MAX_UNIVERSES },
    () => new Uint8Array(DMX_CHANNELS)
  )

  private readonly serial: SerialManager

  // ── Pluggable subsystems ──────────────────────────────────────────────────
  private fixtureManager: MultiUniverseProcessor | null = null
  private sceneManager:   SceneTick              | null = null
  private effectsEngine:  FxEngineTick           | null = null
  private audioEngine:    AudioEngine            | null = null
  private networkManager: NetworkManager         | null = null
  private pixelEngine:    PixelEngine            | null = null
  private chaserManager:  ChaserTick             | null = null

  constructor(serial: SerialManager) {
    this.serial = serial
  }

  // ── Engine lifecycle ────────────────────────────────────────────────────────

  start(): void {
    if (this.loopTimer !== null) return
    this.lastChangedMs = Date.now()
    this._armTimer(RATE_FULL_MS)
    console.log(`[DmxEngine] Starting ${MAX_UNIVERSES}-universe loop at ${1000 / RATE_FULL_MS | 0}Hz (adaptive).`)
  }

  stop(): void {
    if (this.loopTimer === null) return
    clearInterval(this.loopTimer)
    this.loopTimer = null
    this.lastTickMs = 0 // Prevents a massive deltaMs jump on restart
    console.log('[DmxEngine] Universe loop stopped.')
  }

  // ── Subsystem injection ─────────────────────────────────────────────────────

  setFixtureManager(fm: MultiUniverseProcessor): void { this.fixtureManager = fm; console.log('[DmxEngine] FixtureManager attached.') }
  setSceneManager(sm:   SceneTick):              void { this.sceneManager   = sm; console.log('[DmxEngine] SceneManager attached.')   }
  setEffectsEngine(fx:  FxEngineTick):           void { this.effectsEngine  = fx; console.log('[DmxEngine] EffectsEngine attached.')  }
  setAudioEngine(ae:    AudioEngine):            void { this.audioEngine    = ae; console.log('[DmxEngine] AudioEngine attached.')    }
  setNetworkManager(nm: NetworkManager):         void { this.networkManager = nm; console.log('[DmxEngine] NetworkManager attached.') }
  setPixelEngine(pe:    PixelEngine):            void { this.pixelEngine    = pe; console.log('[DmxEngine] PixelEngine attached.')    }
  setChaserManager(cm:  ChaserTick):             void { this.chaserManager  = cm; console.log('[DmxEngine] ChaserManager attached.')  }

  // ── Universe mutation ───────────────────────────────────────────────────────

  /**
   * Sets a single DMX channel on universe 0 (serial port universe).
   * @param channel 1-indexed (1–512)
   */
  setChannel(channel: number, value: number, universeIdx = 0): void {
    if (channel < 1 || channel > DMX_CHANNELS) { console.warn(`[DmxEngine] setChannel: ch ${channel} out of range.`); return }
    if (value   < 0 || value   > 255)           { console.warn(`[DmxEngine] setChannel: val ${value} out of range.`); return }
    const u = Math.max(0, Math.min(MAX_UNIVERSES - 1, universeIdx))
    this.universes[u][channel - 1] = value
    this._rampUp()
  }

  // ── Global Masters Control ──────────────────────────────────────────────────
  setMasterSpeed(speed: number): void {
    this.masterSpeed = Math.max(0, Math.min(2.0, speed))
  }

  setMasterSize(size: number): void {
    this.masterSize = Math.max(0, Math.min(2.0, size))
  }

  setAllPaused(paused: boolean): void {
    this.allPaused = paused
  }

  setChannels(channelMap: Record<number, number>, universeIdx = 0): void {
    for (const [ch, val] of Object.entries(channelMap)) this.setChannel(Number(ch), val, universeIdx)
  }

  // ── Blind Mode ──────────────────────────────────────────────────────────────
  setBlindMode(blind: boolean): void {
    if (blind === this.isBlindMode) return
    
    if (blind) {
      this.isBlindMode = true
      this.blindUnfadeMs = 0
      this.blindUnfadeElapsedMs = 0
      // Freeze the current live output state
      for (let u = 0; u < MAX_UNIVERSES; u++) {
        this.frozenUniverses[u].set(this.outputUniverses[u])
      }
      console.log('[DmxEngine] Blind Mode ENABLED. Physical output frozen.')
    } else {
      this.isBlindMode = false
      this.blindUnfadeMs = 2000 // 2 seconds fade
      this.blindUnfadeElapsedMs = 0
      this._rampUp() // Ensure the engine doesn't idle during crossfade
      console.log('[DmxEngine] Blind Mode DISABLED. Crossfading to live over 2s.')
    }
  }

  /** Full blackout — zeros all channels in ALL universes. */
  blackout(): void {
    for (const u of this.universes) u.fill(0)
    this._rampUp()
  }

  softBlackout(): void {
    // Intensity-only — handled by FixtureManager.softBlackout() via IPC
    this._rampUp()
  }

  private snapshotBuffer = new Uint8Array(DMX_CHANNELS)

  /** Snapshot of a specific universe (0-based index). */
  getUniverseSnapshot(universeIdx = 0): Uint8Array {
    const u = Math.max(0, Math.min(MAX_UNIVERSES - 1, universeIdx))
    this.snapshotBuffer.set(this.universes[u])
    return this.snapshotBuffer
  }

  /** Snapshots of all universes. */
  getAllUniverseSnapshots(): Uint8Array[] {
    return this.universes.map(u => new Uint8Array(u))
  }

  // ── Adaptive framerate ──────────────────────────────────────────────────────

  private _rampUp(): void {
    if (!this.isIdle) return
    console.log('[DmxEngine] Change detected — ramping up to 44Hz.')
    this.isIdle = false
    this.lastChangedMs = Date.now()
    this._armTimer(RATE_FULL_MS)
  }

  private _armTimer(intervalMs: number): void {
    if (this.loopTimer !== null) clearInterval(this.loopTimer)
    this.currentIntervalMs = intervalMs
    this.loopTimer = setInterval(() => this._tick(), intervalMs)
    this.loopTimer.unref()
  }

  /** Returns true if ANY universe differs from its shadow. */
  private _anyUniverseChanged(): boolean {
    for (let u = 0; u < MAX_UNIVERSES; u++) {
      if (Buffer.compare(this.universes[u], this.prevUniverses[u]) !== 0) return true
    }
    return false
  }

  private _snapshotAllUniverses(): void {
    for (let u = 0; u < MAX_UNIVERSES; u++) {
      this.prevUniverses[u].set(this.universes[u])
    }
  }

  // ── Engine tick ─────────────────────────────────────────────────────────────

  private _tick(): void {
    const now     = Date.now()
    const deltaMs = this.lastTickMs > 0 ? now - this.lastTickMs : this.currentIntervalMs
    this.lastTickMs = now

    // ── Apply Master Speed & Pause ────────────────────────────────────────────
    const scaledDeltaMs = this.allPaused ? 0 : deltaMs * this.masterSpeed

    // ── Chaser ───────────────────────────────────────────────────────────────
    this.chaserManager?.tick(scaledDeltaMs)

    // ── Scene Crossfade (Does not pause, scenes must finish fading) ───────────
    this.sceneManager?.tick(deltaMs)

    // ── Audio → FX modulation ─────────────────────────────────────────────────
    if (this.effectsEngine && this.audioEngine && !this.allPaused) {
      this.audioEngine.applyFxModifications(this.effectsEngine)
    }

    // ── FX Engine (LFOs) ──────────────────────────────────────────────────────
    this.effectsEngine?.tick(scaledDeltaMs)
    let fxOffsets = this.effectsEngine?.getOffsets() || {}

    // Apply Master Size to FX Offsets
    if (this.masterSize !== 1.0) {
      const scaledFx: Record<string, Record<string, number>> = {}
      for (const fixId in fxOffsets) {
        scaledFx[fixId] = {}
        for (const ch in fxOffsets[fixId]) {
          scaledFx[fixId][ch] = fxOffsets[fixId][ch] * this.masterSize
        }
      }
      fxOffsets = scaledFx
    }

    // ── Audio fixture offsets ─────────────────────────────────────────────────
    const audioOffsets = this.allPaused ? {} : this.audioEngine?.getFixtureOffsets()

    const mergedOffsets = { ...fxOffsets }
    if (audioOffsets) {
      for (const fixId in audioOffsets) {
        if (!mergedOffsets[fixId]) mergedOffsets[fixId] = {}
        for (const ch in audioOffsets[fixId]) {
          mergedOffsets[fixId][ch] = (mergedOffsets[fixId][ch] || 0) + audioOffsets[fixId][ch]
        }
      }
    }

    // ── Fixture → Universes ────────────────────────────────────────────────────
    // Each fixture writes to universes[fixture.universeIndex ?? 0]
    if (!this.engineBypassed) {
      this.fixtureManager?.applyToUniverses(this.universes, mergedOffsets)
    }

    // ── Pixel Mapping (highest priority, universe 0 only for now) ─────────────
    this.pixelEngine?.applyToUniverse(this.universes[0])

    // ── DMX-IN (HTP Merge) ────────────────────────────────────────────────────
    const incoming = this.networkManager?.getIncomingUniverses()
    if (incoming) {
      for (let u = 0; u < MAX_UNIVERSES; u++) {
        if (!incoming[u]) continue
        for (let i = 0; i < DMX_CHANNELS; i++) {
          if (incoming[u][i] > this.universes[u][i]) {
            this.universes[u][i] = incoming[u][i]
          }
        }
      }
    }

    // ── Adaptive Framerate ────────────────────────────────────────────────────
    let changed = this._anyUniverseChanged()
    if (this.blindUnfadeElapsedMs < this.blindUnfadeMs) changed = true // Force active during crossfade
    
    if (changed) {
      this._snapshotAllUniverses()
      this.lastChangedMs = now
      if (this.isIdle) {
        console.log('[DmxEngine] Universe active — ramping to 44Hz.')
        this.isIdle = false
        this._armTimer(RATE_FULL_MS)
      }
    } else if (!this.isIdle && (now - this.lastChangedMs) > IDLE_THRESHOLD_MS) {
      console.log('[DmxEngine] All universes static — dropping to 5Hz idle rate.')
      this.isIdle = true
      this._armTimer(RATE_IDLE_MS)
    }

    // ── Resolve Output Universes (Blind Mode) ─────────────────────────────────
    let sendingUniverses = this.universes

    if (this.isBlindMode) {
      // Physical output is completely frozen
      sendingUniverses = this.frozenUniverses
    } else if (this.blindUnfadeElapsedMs < this.blindUnfadeMs) {
      // Crossfading from frozen to live
      this.blindUnfadeElapsedMs += deltaMs
      const t = Math.min(1, this.blindUnfadeElapsedMs / this.blindUnfadeMs)
      
      for (let u = 0; u < MAX_UNIVERSES; u++) {
        for (let i = 0; i < DMX_CHANNELS; i++) {
          const source = this.frozenUniverses[u][i]
          const target = this.universes[u][i]
          this.outputUniverses[u][i] = Math.round(source + (target - source) * t)
        }
      }
      sendingUniverses = this.outputUniverses
      
      if (t >= 1) this.blindUnfadeMs = 0 // Done fading
    } else {
      // Normal live mode
      for (let u = 0; u < MAX_UNIVERSES; u++) {
        this.outputUniverses[u].set(this.universes[u])
      }
      sendingUniverses = this.outputUniverses
    }

    // ── Serial Output (universe 0 → Enttec USB Pro) ───────────────────────────
    this._buildAndSendPacket(sendingUniverses[0])

    // ── Art-Net Output (all universes) ────────────────────────────────────────
    this.networkManager?.broadcastAll(sendingUniverses)
  }

  /**
   * Serializes a universe into the pre-allocated Enttec packet buffer
   * and sends it over serial.
   *
   * Layout (Enttec DMX USB Pro):
   *   [0x7E][0x06][LSB][MSB][0x00][ch1…ch512][0xE7]
   */
  private _buildAndSendPacket(universe: Uint8Array): void {
    for (let i = 0; i < DMX_CHANNELS; i++) {
      packetBuffer[5 + i] = universe[i]
    }
    this.serial.write(packetBuffer)
  }
}
