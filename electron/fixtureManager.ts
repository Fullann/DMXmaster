import { app } from 'electron'
import { promises as fs } from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import type {
  FixtureProfile, PatchedFixture, FixtureLogicalState,
  ChannelType, ProfileEntry, FixtureGroup,
} from './fixtureTypes'
import { DEFAULT_LOGICAL_STATE, DEFAULT_PROFILES } from './fixtureTypes'

// ─────────────────────────────────────────────────────────────────────────────
// FixtureManager
//
// Three responsibilities:
//  1. Disk I/O — reads/writes FixtureProfile JSON from ~/Documents/DmxMaster/Profiles/
//  2. Patch management — maps profiles to DMX start addresses at runtime
//  3. Universe resolution — called by DmxEngine each tick to translate
//     logical state (e.g., "Red = 200") into raw DMX channel bytes
// ─────────────────────────────────────────────────────────────────────────────

export class FixtureManager {
  private profilesDir: string = ''
  private patchPath: string = ''
  private groupsPath: string = ''

  private profiles = new Map<string, FixtureProfile>()
  private patch: PatchedFixture[] = []
  private groups: FixtureGroup[] = []
  private fixtureStates = new Map<string, FixtureLogicalState>()

  // ── Masters State ─────────────────────────────────────────────────────────
  private grandMaster = 1.0
  private submasters = new Map<string, number>()

  // ── Initialization ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    const appDir = path.join(app.getPath('documents'), 'DmxMaster')
    this.profilesDir = path.join(appDir, 'Profiles')
    this.patchPath = path.join(appDir, 'Patch.json')
    this.groupsPath = path.join(appDir, 'Groups.json')

    // Create directories
    await fs.mkdir(this.profilesDir, { recursive: true })

    // On first run (empty dir) write the bundled default profiles
    const existing = await fs.readdir(this.profilesDir)
    if (existing.filter(f => f.endsWith('.json')).length === 0) {
      await this._writeDefaultProfiles()
    }

    await this.loadProfiles()
    await this._loadPatch()
    await this._loadGroups()

    console.log(`[FixtureManager] Initialized.`)
  }

  private async _writeDefaultProfiles(): Promise<void> {
    for (const { key, profile } of DEFAULT_PROFILES) {
      const filePath = path.join(this.profilesDir, `${key}.json`)
      await fs.writeFile(filePath, JSON.stringify(profile, null, 2), 'utf-8')
    }
    console.log(`[FixtureManager] Wrote ${DEFAULT_PROFILES.length} bundled default profiles.`)
  }

  private async _loadPatch(): Promise<void> {
    try {
      const data = await fs.readFile(this.patchPath, 'utf8')
      this.patch = JSON.parse(data)
      
      // Initialize logical states for all patched fixtures
      for (const fixture of this.patch) {
        if (!this.fixtureStates.has(fixture.id)) {
          this.fixtureStates.set(fixture.id, { ...DEFAULT_LOGICAL_STATE })
        }
      }
    } catch (e: any) {
      if (e.code !== 'ENOENT') console.error('[FixtureManager] Error loading patch:', e.message)
    }
  }

  private async _loadGroups(): Promise<void> {
    try {
      const data = await fs.readFile(this.groupsPath, 'utf8')
      this.groups = JSON.parse(data)
    } catch (e: any) {
      if (e.code !== 'ENOENT') console.error('[FixtureManager] Error loading groups:', e.message)
    }
  }

  // ── Profile I/O ─────────────────────────────────────────────────────────────

  async loadProfiles(): Promise<void> {
    this.profiles.clear()
    const files = await fs.readdir(this.profilesDir)

    for (const file of files.filter(f => f.endsWith('.json'))) {
      try {
        const raw = await fs.readFile(path.join(this.profilesDir, file), 'utf-8')
        const profile = JSON.parse(raw) as FixtureProfile
        const key = file.replace(/\.json$/, '')
        this.profiles.set(key, profile)
      } catch (err) {
        console.warn(`[FixtureManager] Skipped malformed profile: ${file}`, err)
      }
    }
  }

  getProfiles(): ProfileEntry[] {
    return Array.from(this.profiles.entries()).map(([key, profile]) => ({ key, profile }))
  }

  async saveProfile(profile: FixtureProfile): Promise<string> {
    const key = this._profileKey(profile)
    const filePath = path.join(this.profilesDir, `${key}.json`)
    await fs.writeFile(filePath, JSON.stringify(profile, null, 2), 'utf-8')
    this.profiles.set(key, profile)
    console.log(`[FixtureManager] Saved profile: ${key}`)
    return key
  }

  async deleteProfile(key: string): Promise<void> {
    const filePath = path.join(this.profilesDir, `${key}.json`)
    try {
      await fs.unlink(filePath)
      this.profiles.delete(key)
    } catch {
      console.warn(`[FixtureManager] Could not delete profile file: ${key}`)
    }
  }

  /** Deterministic filename key from profile metadata */
  private _profileKey(profile: FixtureProfile): string {
    return `${profile.manufacturer}_${profile.model}_${profile.mode}`
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/__+/g, '_')
      .toLowerCase()
      .slice(0, 80)
  }

  // ── Patch management ─────────────────────────────────────────────────────────

  patchFixture(profileKey: string, startAddress: number, label?: string, universeIndex = 0): PatchedFixture {
    const profile = this.profiles.get(profileKey)
    if (!profile) throw new Error(`Profile not found: "${profileKey}"`)
    if (startAddress < 1 || startAddress > 512) {
      throw new Error(`Invalid DMX start address: ${startAddress} (must be 1–512)`)
    }

    const id: string = randomUUID()
    const fixture: PatchedFixture = {
      id,
      profileKey,
      profile,
      startAddress,
      label: label?.trim() || `${profile.manufacturer} ${profile.model}`,
      universeIndex,
      position3d: [0, 0, 0], // Default position, visualizer auto-layout might override this or use it
    }

    this.patch.push(fixture)
    const initialState: FixtureLogicalState = { ...DEFAULT_LOGICAL_STATE }
    this.fixtureStates.set(id, initialState)
    this.savePatch(this.patch).catch(err => console.error('[FixtureManager] Error saving patch after patchFixture:', err))

    console.log(`[FixtureManager] Patched "${fixture.label}" at CH ${startAddress}.`)
    return fixture
  }

  removePatchedFixture(id: string): void {
    const idx = this.patch.findIndex(f => f.id === id)
    if (idx !== -1) {
      console.log(`[FixtureManager] Removed patch: ${this.patch[idx].label}`)
      this.patch.splice(idx, 1)
      this.fixtureStates.delete(id)
    }
  }

  getPatch(): PatchedFixture[] {
    return this.patch
  }

  async savePatch(newPatch: PatchedFixture[]): Promise<void> {
    this.patch = newPatch
    await fs.writeFile(this.patchPath, JSON.stringify(this.patch, null, 2), 'utf8')
  }

  async setFixturePosition(id: string, position3d: [number, number, number]): Promise<void> {
    const fixture = this.patch.find(f => f.id === id)
    if (fixture) {
      fixture.position3d = position3d
      await this.savePatch(this.patch)
      console.log(`[FixtureManager] Saved position for ${fixture.label} -> [${position3d.join(', ')}]`)
    }
  }

  async setFixtureRotation(id: string, rotation3d: [number, number, number]): Promise<void> {
    const fixture = this.patch.find(f => f.id === id)
    if (fixture) {
      fixture.rotation3d = rotation3d
      await this.savePatch(this.patch)
      console.log(`[FixtureManager] Saved rotation for ${fixture.label} -> [${rotation3d.join(', ')}]`)
    }
  }

  async setFixtureUniverse(id: string, universeIndex: number): Promise<void> {
    const fixture = this.patch.find(f => f.id === id)
    if (fixture) {
      fixture.universeIndex = universeIndex
      await this.savePatch(this.patch)
      console.log(`[FixtureManager] Moved ${fixture.label} to universe ${universeIndex}`)
    }
  }

  // ── Groups API ────────────────────────────────────────────────────────────

  getGroups(): FixtureGroup[] {
    return this.groups
  }

  async saveGroups(newGroups: FixtureGroup[]): Promise<void> {
    this.groups = newGroups
    await fs.writeFile(this.groupsPath, JSON.stringify(this.groups, null, 2), 'utf8')
  }

  // ── Submaster API ─────────────────────────────────────────────────────────

  setGrandMaster(level: number): void {
    this.grandMaster = Math.max(0, Math.min(1.0, level))
  }

  setSubmaster(groupId: string, level: number): void {
    this.submasters.set(groupId, Math.max(0, Math.min(1.0, level)))
  }

  // ── Logical commands ─────────────────────────────────────────────────────────

  sendCommand(fixtureId: string, type: ChannelType, value: number): void {
    const state = this.fixtureStates.get(fixtureId)
    if (!state) return

    const v = Math.max(0, Math.min(255, value))
    switch (type) {
      case 'Intensity': state.intensity = v; break
      case 'Red':       state.r = v;         break
      case 'Green':     state.g = v;         break
      case 'Blue':      state.b = v;         break
      case 'White':     state.w = v;         break
      case 'Smoke':     state.smoke = v;     break
      case 'Pan':       state.pan = v;       break
      case 'Tilt':      state.tilt = v;      break
      case 'Shutter':
      case 'Strobe':    state.shutter = v;   break
      case 'Speed':     state.speed = v;     break
      case 'Effect':    state.effect = v;    break
      case 'Color':     state.color = v;     break
      default: break
    }
  }

  /**
   * Atomic RGB(W) colour command — sets r, g, b, and optionally w in one call.
   * More efficient than three separate sendCommand calls.
   */
  sendColor(fixtureId: string, r: number, g: number, b: number, w = 0): void {
    const state = this.fixtureStates.get(fixtureId)
    if (!state) return
    state.r = Math.max(0, Math.min(255, r))
    state.g = Math.max(0, Math.min(255, g))
    state.b = Math.max(0, Math.min(255, b))
    state.w = Math.max(0, Math.min(255, w))
  }

  /**
   * Partial logical state update — used by SceneManager during crossfades.
   * Only the keys present in `updates` are written; other parameters are
   * left untouched (tracking model).
   */
  setLogicalState(fixtureId: string, updates: Record<string, number>): void {
    const state = this.fixtureStates.get(fixtureId)
    if (!state) return
    for (const [key, val] of Object.entries(updates)) {
      if (key in state) {
        ;(state as Record<string, number>)[key] = Math.max(0, Math.min(255, val))
      }
    }
  }

  /**
   * Bulk logical state restore — used by the Undo/Redo system.
   * Applies a full programmer snapshot for every fixture in the map.
   * Only keys present in each fixture's state object are written (safe).
   */
  setLogicalStates(statesMap: Record<string, Record<string, number>>): void {
    for (const [fixtureId, updates] of Object.entries(statesMap)) {
      this.setLogicalState(fixtureId, updates)
    }
  }

  /** Returns the current logical state for a single fixture (by reference — read-only). */
  getFixtureState(fixtureId: string): Readonly<FixtureLogicalState> | undefined {
    return this.fixtureStates.get(fixtureId)
  }

  /**
   * Resets all patched fixtures to their DEFAULT_LOGICAL_STATE.
   * Used by the "Clear Programmer" button.
   */
  clearAll(): void {
    for (const id of this.fixtureStates.keys()) {
      this.fixtureStates.set(id, { ...DEFAULT_LOGICAL_STATE })
    }
    console.log('[FixtureManager] Programmer cleared.')
  }

  /**
   * Zeros only the intensity channel for every patched fixture.
   * Preserves Color, Pan/Tilt and all other parameters intact.
   * Triggered by the Global Blackout keyboard shortcut (Space).
   */
  softBlackout(): void {
    for (const state of this.fixtureStates.values()) {
      state.intensity = 0
    }
    console.log('[FixtureManager] Soft blackout applied (intensity → 0).')
  }

  getFixtureStates(): Record<string, FixtureLogicalState> {
    return Object.fromEntries(this.fixtureStates.entries())
  }

  // ── Universe resolution (hot path — called at ~44 Hz) ────────────────────────

  /**
   * Writes all fixture logical states into the raw DMX universe buffers.
   * Called inside DmxEngine._tick() BEFORE the Enttec packet is built.
   *
   * Address calculation:
   *   universeIndex = (startAddress − 1) + (channel.number − 1)
   *                 = startAddress + channel.number − 2
   */
  applyToUniverses(universes: Uint8Array[], fxOffsets?: Record<string, Record<string, number>>): void {
    for (const fixture of this.patch) {
      const state = this.fixtureStates.get(fixture.id)
      if (!state) continue

      const uIdx = fixture.universeIndex ?? 0
      if (uIdx < 0 || uIdx >= universes.length) continue
      const targetUniverse = universes[uIdx]

      const offsets = fxOffsets?.[fixture.id]

      for (const ch of fixture.profile.channels) {
        const idx = fixture.startAddress + ch.number - 2
        if (idx < 0 || idx >= 512) continue

        let v: number = ch.defaultValue
        switch (ch.type) {
          case 'Intensity': v = state.intensity; break
          case 'Red':       v = state.r;         break
          case 'Green':     v = state.g;         break
          case 'Blue':      v = state.b;         break
          case 'White':     v = state.w;         break
          case 'Smoke':     v = state.smoke;     break
          case 'Pan':       v = state.pan;       break
          case 'Tilt':      v = state.tilt;      break
          case 'Shutter':
          case 'Strobe':    v = state.shutter;   break
          case 'Speed':     v = state.speed;     break
          case 'Effect':    v = state.effect;    break
          case 'Color':     v = state.color;     break
          default:          continue // Skip updating DMX universe for custom/unknown channels so Dashboard can control them
        }

        // Apply dynamic FX offset (LTP addition) if one exists for this channel type
        if (offsets) {
          const stateKey = channelTypeToStateKey(ch.type)
          if (stateKey && offsets[stateKey] !== undefined) {
            v += offsets[stateKey]
          }
        }

        // ── Submaster & Grand Master (Intensity channels only) ────────────────
        if (ch.type === 'Intensity') {
          // HTP: find the highest submaster among all groups this fixture belongs to
          let highestSub = -1
          for (const g of this.groups) {
            if (g.fixtureIds.includes(fixture.id)) {
              const lvl = this.submasters.has(g.id) ? this.submasters.get(g.id)! : 1.0
              if (lvl > highestSub) highestSub = lvl
            }
          }
          // Only apply a group submaster if the fixture is actually in a group
          if (highestSub >= 0) v = v * highestSub
          // Always apply grand master
          v = v * this.grandMaster
        }

        targetUniverse[idx] = Math.max(0, Math.min(255, Math.round(v)))
      }
    }
  }
}

// ── Internal helper ──────────────────────────────────────────────────────────

function channelTypeToStateKey(type: ChannelType): keyof FixtureLogicalState | null {
  const map: Partial<Record<ChannelType, keyof FixtureLogicalState>> = {
    Intensity: 'intensity',
    Red: 'r', Green: 'g', Blue: 'b', White: 'w',
    Smoke: 'smoke', Pan: 'pan', Tilt: 'tilt',
    Shutter: 'shutter', Strobe: 'shutter',
    Speed: 'speed', Effect: 'effect', Color: 'color',
  }
  return map[type] ?? null
}
