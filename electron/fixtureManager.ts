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
  
  // ── Blind Mode State ──────────────────────────────────────────────────────
  private isBlindMode = false
  private blindCrossfaderValue = 0.0
  private blindStates = new Map<string, FixtureLogicalState>()

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
      
      let maxUserNumber = 0
      
      // Initialize logical states for all patched fixtures
      for (const fixture of this.patch) {
        if (!this.fixtureStates.has(fixture.id)) {
          this.fixtureStates.set(fixture.id, { ...DEFAULT_LOGICAL_STATE })
        }
        if (!this.blindStates.has(fixture.id)) {
          this.blindStates.set(fixture.id, { ...DEFAULT_LOGICAL_STATE })
        }
        if (fixture.userNumber) {
          maxUserNumber = Math.max(maxUserNumber, fixture.userNumber)
        }
      }
      
      // Backward compatibility: assign userNumber to existing fixtures that don't have one
      let needsSave = false
      for (const fixture of this.patch) {
        if (fixture.userNumber === undefined) {
          maxUserNumber++
          fixture.userNumber = maxUserNumber
          needsSave = true
        }
      }
      if (needsSave) {
        await this.savePatch(this.patch)
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
    const maxUserNumber = this.patch.reduce((max, f) => Math.max(max, f.userNumber || 0), 0)
    
    const fixture: PatchedFixture = {
      id,
      profileKey,
      profile,
      startAddress,
      label: label?.trim() || `${profile.manufacturer} ${profile.model}`,
      userNumber: maxUserNumber + 1,
      universeIndex,
      position3d: [0, 0, 0], // Default position, visualizer auto-layout might override this or use it
      rotation3d: [0, 0, 0],
    }

    this.patch.push(fixture)
    const initialState: FixtureLogicalState = { ...DEFAULT_LOGICAL_STATE }
    this.fixtureStates.set(id, initialState)
    this.blindStates.set(id, { ...DEFAULT_LOGICAL_STATE })
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
      this.blindStates.delete(id)
    }
  }

  async morphFixture(id: string, newProfileKey: string, newStartAddress?: number): Promise<PatchedFixture> {
    const fixture = this.patch.find(f => f.id === id)
    if (!fixture) throw new Error(`Fixture not found: ${id}`)
    
    const profile = this.profiles.get(newProfileKey)
    if (!profile) throw new Error(`Profile not found: "${newProfileKey}"`)
    
    fixture.profileKey = newProfileKey
    fixture.profile = profile
    if (newStartAddress !== undefined) {
      fixture.startAddress = newStartAddress
    }
    
    // Label can stay the same, or we can update it if the user wants. We'll leave it unchanged so they don't lose their custom name.
    await this.savePatch()
    console.log(`[FixtureManager] Morphed "${fixture.label}" to profile ${newProfileKey}.`)
    return fixture
  }

  async unpatchAll(): Promise<void> {
    const count = this.patch.length
    this.patch = []
    this.fixtureStates.clear()
    this.blindStates.clear()
    await this.savePatch()
    console.log(`[FixtureManager] Unpatched all (${count} fixtures removed).`)
  }

  getPatch(): PatchedFixture[] {
    return this.patch
  }

  async savePatch(newPatch?: PatchedFixture[]): Promise<void> {
    if (newPatch) this.patch = newPatch
    await fs.writeFile(this.patchPath, JSON.stringify(this.patch, null, 2), 'utf8')
  }

  async setFixtureTransform(id: string, position3d: [number, number, number], rotation3d: [number, number, number]): Promise<void> {
    const fixture = this.patch.find(f => f.id === id)
    if (fixture) {
      fixture.position3d = position3d
      fixture.rotation3d = rotation3d
      await this.savePatch()
      console.log(`[FixtureManager] Saved transform for ${fixture.label}`)
    }
  }

  async setFixturePosition(id: string, position3d: [number, number, number]): Promise<void> {
    const fixture = this.patch.find(f => f.id === id)
    if (fixture) {
      fixture.position3d = position3d
      await this.savePatch()
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

  async renameGroup(id: string, name: string): Promise<void> {
    const group = this.groups.find(g => g.id === id)
    if (group) {
      group.name = name
      await this.saveGroups(this.groups)
      console.log(`[FixtureManager] Renamed group ${id} to "${name}"`)
    }
  }

  async cloneFixtureGroups(sourceId: string, destId: string): Promise<void> {
    let changed = false
    for (const g of this.groups) {
      if (g.fixtureIds.includes(sourceId) && !g.fixtureIds.includes(destId)) {
        g.fixtureIds.push(destId)
        changed = true
      }
    }
    if (changed) {
      await this.saveGroups(this.groups)
      console.log(`[FixtureManager] Cloned group memberships from ${sourceId} to ${destId}`)
    }
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
    const targetMap = this.isBlindMode ? this.blindStates : this.fixtureStates
    const state = targetMap.get(fixtureId)
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
    const targetMap = this.isBlindMode ? this.blindStates : this.fixtureStates
    const state = targetMap.get(fixtureId)
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
    // Note: Scene playback always targets live fixtureStates, not blind.
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
      // Respect blind mode for full programmer clear/restore
      const targetMap = this.isBlindMode ? this.blindStates : this.fixtureStates
      const state = targetMap.get(fixtureId)
      if (!state) continue
      for (const [key, val] of Object.entries(updates)) {
        if (key in state) {
          ;(state as Record<string, number>)[key] = Math.max(0, Math.min(255, val))
        }
      }
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
    const targetMap = this.isBlindMode ? this.blindStates : this.fixtureStates
    for (const id of targetMap.keys()) {
      targetMap.set(id, { ...DEFAULT_LOGICAL_STATE })
    }
    console.log(`[FixtureManager] ${this.isBlindMode ? 'Blind ' : ''}Programmer cleared.`)
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

  // ── Blind Mode API ────────────────────────────────────────────────────────

  getIsBlindMode(): boolean {
    return this.isBlindMode
  }

  setBlindMode(active: boolean): void {
    this.isBlindMode = active
    if (active) {
      // When entering blind mode, the blind programmer copies the live programmer to avoid jumps
      for (const [id, liveState] of this.fixtureStates.entries()) {
        this.blindStates.set(id, { ...liveState })
      }
    }
    console.log(`[FixtureManager] Blind mode ${active ? 'ENABLED' : 'DISABLED'}.`)
  }

  setBlindCrossfader(value: number): void {
    this.blindCrossfaderValue = Math.max(0, Math.min(1, value))
    
    // Auto-commit and disable blind mode when reaching 100%
    if (this.blindCrossfaderValue >= 1.0) {
      for (const [id, blindState] of this.blindStates.entries()) {
        this.fixtureStates.set(id, { ...blindState })
      }
      this.isBlindMode = false
      this.blindCrossfaderValue = 0.0
      console.log(`[FixtureManager] Blind crossfade complete. Blind mode disabled.`)
    }
  }

  getBlindCrossfader(): number {
    return this.blindCrossfaderValue
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
  applyToUniverses(universes: Uint8Array[], fxOffsets: Record<string, Partial<FixtureLogicalState>> | null): void {
    // Pre-calculate highest submaster level for each fixture to avoid O(N*M) lookups inside the loop
    const fixtureSubmasters = new Map<string, number>()
    for (const g of this.groups) {
      const lvl = this.submasters.has(g.id) ? this.submasters.get(g.id)! : 1.0
      for (const fid of g.fixtureIds) {
        const current = fixtureSubmasters.get(fid) ?? -1
        if (lvl > current) fixtureSubmasters.set(fid, lvl)
      }
    }

    for (const fixture of this.patch) {
      const liveState = this.fixtureStates.get(fixture.id)
      const blindState = this.blindStates.get(fixture.id)
      if (!liveState) continue

      const c = this.blindCrossfaderValue
      const useBlind = c > 0 && blindState

      const uIdx = fixture.universeIndex ?? 0
      if (uIdx < 0 || uIdx >= universes.length) continue
      const targetUniverse = universes[uIdx]

      const offsets = fxOffsets?.[fixture.id]

      for (const ch of fixture.profile.channels) {
        const idx = fixture.startAddress + ch.number - 2
        if (idx < 0 || idx >= 512) continue

        let v: number = ch.defaultValue
        let bv: number = ch.defaultValue
        switch (ch.type) {
          case 'Intensity': v = liveState.intensity; bv = blindState?.intensity ?? v; break
          case 'Red':       v = liveState.r;         bv = blindState?.r ?? v;         break
          case 'Green':     v = liveState.g;         bv = blindState?.g ?? v;         break
          case 'Blue':      v = liveState.b;         bv = blindState?.b ?? v;         break
          case 'White':     v = liveState.w;         bv = blindState?.w ?? v;         break
          case 'Smoke':     v = liveState.smoke;     bv = blindState?.smoke ?? v;     break
          case 'Pan':       v = liveState.pan;       bv = blindState?.pan ?? v;       break
          case 'Tilt':      v = liveState.tilt;      bv = blindState?.tilt ?? v;      break
          case 'Shutter':
          case 'Strobe':    v = liveState.shutter;   bv = blindState?.shutter ?? v;   break
          case 'Speed':     v = liveState.speed;     bv = blindState?.speed ?? v;     break
          case 'Effect':    v = liveState.effect;    bv = blindState?.effect ?? v;    break
          case 'Color':     v = liveState.color;     bv = blindState?.color ?? v;     break
          default:          continue // Skip updating DMX universe for custom/unknown channels
        }

        if (useBlind) {
          v = v * (1 - c) + bv * c
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
          const highestSub = fixtureSubmasters.get(fixture.id) ?? -1
          
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
