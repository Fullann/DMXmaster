import { useState, useEffect, useRef, useCallback } from 'react'
import { useSerial }   from '@/hooks/useSerial'
import { useDmx }     from '@/hooks/useDmx'
import { useMidi }    from '@/hooks/useMidi'
import { useFixtures } from '@/hooks/useFixtures'
import { useScenes }   from '@/hooks/useScenes'
import { useChaser }   from '@/hooks/useChaser'
import { useProgrammerHistory } from '@/hooks/useProgrammerHistory'
import { useGlobalShortcuts }   from '@/hooks/useGlobalShortcuts'
import { SerialConnectionPanel } from '@/components/serial/SerialConnectionPanel'
import { ChannelSlider }         from '@/components/dmx/ChannelSlider'
import { MidiMonitor }           from '@/components/midi/MidiMonitor'
import { FixtureBuilder }        from '@/components/fixtures/FixtureBuilder'
import { AiImportTool }          from '@/components/fixtures/AiImportTool'
import { PatchGrid }             from '@/components/fixtures/PatchGrid'
import { LogicalControl }        from '@/components/fixtures/LogicalControl'
import { SubmasterConsole }      from '@/components/control/SubmasterConsole'
import { SceneRecorder }         from '@/components/scenes/SceneRecorder'
import { BuskingGrid }           from '@/components/scenes/BuskingGrid'
import { ChaserEditor }          from '@/components/scenes/ChaserEditor'
import { UndoRedoBar }           from '@/components/scenes/UndoRedoBar'
import { FxGenerator }           from '@/components/fx/FxGenerator'
import { LiveGrid }              from '@/components/live/LiveGrid'
import { AudioDashboard }        from '@/components/audio/AudioDashboard'
import { PixelMapper }           from '@/components/pixel/PixelMapper'
import { TimelineSequencer }     from '@/components/timeline/TimelineSequencer'
import { StageVisualizer }       from '@/components/visualizer/StageVisualizer'
import { useFx }                 from '@/hooks/useFx'
import { useLiveGrid }           from '@/hooks/useLiveGrid'
import { useNetwork }            from '@/hooks/useNetwork'
import type { FixtureProfile }   from '@/types/fixtures'
import type { ParameterGroup }   from '@/types/scenes'
import '@/styles/index.css'

// ─────────────────────────────────────────────────────────────────────────────
// App — root component with tab navigation
// ─────────────────────────────────────────────────────────────────────────────

type AppView = 'dashboard' | 'library' | 'patch' | 'control' | 'scenes' | 'chaser' | 'fx' | 'live' | 'audio' | 'pixel' | 'timeline' | 'visualizer'

const TABS: { id: AppView; label: string; icon: string }[] = [
  { id: 'live',      label: 'Live Grid',    icon: '🎛' },
  { id: 'dashboard', label: 'Dashboard',    icon: '⚡' },
  { id: 'library',   label: 'Library',      icon: '📁' },
  { id: 'patch',     label: 'Patch',        icon: '🔌' },
  { id: 'control',   label: 'Control',      icon: '🎛' },
  { id: 'scenes',    label: 'Scenes',       icon: '🎬' },
  { id: 'chaser',    label: 'Chasers',      icon: '🔄' },
  { id: 'fx',        label: 'FX Generator', icon: '🌊' },
  { id: 'audio',     label: 'Audio Input',  icon: '🎤' },
  { id: 'pixel',     label: 'Pixel Mapper', icon: '📺' },
  { id: 'timeline',  label: 'Timeline',     icon: '⏳' },
  { id: 'visualizer',label: '3D View',      icon: '👁' },
]

const VISIBLE_CHANNELS = 4
const CHANNEL_LABELS: Record<number, string> = {
  1: 'Channel 1', 2: 'Channel 2', 3: 'Channel 3', 4: 'Channel 4',
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard')

  const serial   = useSerial()
  const dmx      = useDmx()
  const midi     = useMidi()
  const fixtures = useFixtures()
  const sceneState = useScenes()
  const chaserState = useChaser()
  const programmerHistory = useProgrammerHistory()
  const fxState  = useFx()
  const network  = useNetwork()
  
  const liveGridState = useLiveGrid(
    midi.lastMessage, 
    midi.sendMidiColor,
    sceneState.recallScene,
    (id) => {}, // FX trigger not fully implemented via grid yet, but hook is ready
    sceneState.clearProgrammer
  )

  // Keep programmer history in sync with fixture states
  useEffect(() => {
    programmerHistory.syncStates(fixtures.states)
  }, [fixtures.states])

  // ── MIDI → DMX Bridge ───────────────────────────────────────────────────────

  const midiTriggeredRef = useRef(false)
  useEffect(() => {
    if (!midi.lastMessage) return
    midiTriggeredRef.current = true
    if (midi.lastMessage.type === 'noteOn')  dmx.updateChannel(1, 255)
    if (midi.lastMessage.type === 'noteOff') dmx.updateChannel(1, 0)
    midiTriggeredRef.current = false
  }, [midi.lastMessage]) // dmx.updateChannel is stable

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSaveProfile = useCallback(async (profile: FixtureProfile) => {
    await fixtures.saveProfile(profile)
  }, [fixtures])

  const handlePatch = useCallback(async (
    profileKey: string, startAddress: number, label?: string,
  ) => {
    await fixtures.patchFixture(profileKey, startAddress, label)
  }, [fixtures])

  // Scene save with undo snapshot + filter mask
  const handleSaveScene = useCallback(async (
    name: string, fadeMs: number, filterMask: ParameterGroup,
  ) => {
    programmerHistory.push(`Record "${name}"`, fixtures.states as any)
    await sceneState.saveCurrentAsScene(name, fadeMs, filterMask)
  }, [fixtures.states, programmerHistory, sceneState])

  // ── Soft Blackout (SPACE shortcut) ───────────────────────────────────────────
  const handleSoftBlackout = useCallback(() => {
    window.dmxAPI.softBlackout()
  }, [])

  // ── Global keyboard shortcuts ────────────────────────────────────────────────
  useGlobalShortcuts({
    onSoftBlackout:    handleSoftBlackout,
    onTriggerFirstRow: liveGridState.triggerFirstRow,
    onSwitchPage:      liveGridState.switchPage,
  })

  const isMidiBridgeActive =
    midi.lastMessage?.type === 'noteOn' || midi.lastMessage?.type === 'noteOff'

  // ── Derived ─────────────────────────────────────────────────────────────────

  const patchCount = fixtures.patch.length

  return (
    <div className="app-shell">

      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-logo">
          <div className="topbar-logo-icon">⚡</div>
          <span className="topbar-logo-text">DMX Master</span>
        </div>
        <div className="topbar-badges">
          <div className="topbar-badge badge-engine">
            <span className="badge-dot pulse" />
            Engine Running
          </div>
          {patchCount > 0 && (
            <div className="topbar-badge badge-connected">
              <span className="badge-dot" />
              {patchCount} Fixture{patchCount !== 1 ? 's' : ''} Patched
            </div>
          )}
          {serial.isConnected ? (
            <div className="topbar-badge badge-connected">
              <span className="badge-dot" />
              {serial.selectedPort.split('/').pop() ?? serial.selectedPort}
            </div>
          ) : (
            <div className="topbar-badge badge-disconnected">
              <span className="badge-dot" />
              No Device
            </div>
          )}
          </div>
          
          {/* Global Controls & File Management */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          
          {/* File Menu / Show Management */}
          <div style={{ display: 'flex', gap: '0.5rem', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '1rem' }}>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => window.appAPI.newShow()}>
              📄 New Show
            </button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => window.appAPI.importShow()}>
              📂 Import
            </button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => window.appAPI.exportShow()}>
              💾 Export
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className={`status-badge ${network.config.broadcastEnabled ? 'status-connected' : 'status-disconnected'}`} 
                 style={{ cursor: 'pointer', padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                 onClick={() => network.setBroadcastEnabled(!network.config.broadcastEnabled)}
                 title="Toggle Art-Net Broadcast"
            >
              <div className="status-dot"></div>
              Network: {network.config.broadcastEnabled ? 'ON' : 'OFF'}
            </div>
            <div className={`status-badge ${serial.isConnected ? 'status-connected' : 'status-disconnected'}`}>
              <div className="status-dot"></div>
              {serial.isConnected ? 'USB DMX Active' : 'USB DMX Offline'}
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ───────────────────────────────────────────────────── */}
      <nav className="tab-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            className={`tab-btn ${currentView === tab.id ? 'active' : ''}`}
            onClick={() => setCurrentView(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Content Area ─────────────────────────────────────────────────────── */}
      <div className="content-area">

        {/* ════ DASHBOARD ═══════════════════════════════════════════════════════ */}
        {currentView === 'dashboard' && (
          <>
            <aside className="sidebar">
              <SerialConnectionPanel
                ports={serial.ports}
                selectedPort={serial.selectedPort}
                isConnected={serial.isConnected}
                isLoading={serial.isLoading}
                error={serial.error}
                onPortSelect={serial.setSelectedPort}
                onConnect={() => serial.connect(serial.selectedPort)}
                onDisconnect={serial.disconnect}
                onRefresh={serial.listPorts}
              />
              <MidiMonitor
                midiStatus={midi.midiStatus}
                midiInputs={midi.midiInputs}
                lastMessage={midi.lastMessage}
              />
              <div className="midi-bridge-info">
                <span className={`midi-bridge-dot ${isMidiBridgeActive ? 'active' : ''}`} />
                MIDI → CH1 bridge active
              </div>
              <button id="btn-blackout" className="btn-blackout" onClick={dmx.blackout}>
                ◼ Blackout
              </button>
            </aside>

            <main className="main-content">
              <div className="sliders-section">
                <div className="section-title">Universe 1 — Raw Channels</div>
                <div className="sliders-row">
                  {Array.from({ length: VISIBLE_CHANNELS }, (_, i) => {
                    const ch = i + 1
                    return (
                      <ChannelSlider
                        key={ch}
                        channel={ch}
                        label={CHANNEL_LABELS[ch]}
                        externalValue={dmx.universe[ch - 1]}
                        onChannelChange={dmx.updateChannel}
                      />
                    )
                  })}
                </div>
              </div>
            </main>
          </>
        )}

        {/* ════ LIBRARY ═════════════════════════════════════════════════════════ */}
        {currentView === 'library' && (
          <div className="view-full library-view">
            <div className="library-col">
              <div className="panel">
                <FixtureBuilder onSave={handleSaveProfile} />
              </div>
            </div>
            <div className="library-col">
              <div className="panel">
                <AiImportTool onSave={handleSaveProfile} />
              </div>
              {/* Profile list */}
              <div className="panel profile-list-panel">
                <div className="panel-header">
                  <span className="panel-title">Saved Profiles ({fixtures.profiles.length})</span>
                  <button className="btn btn-ghost" style={{ fontSize: '0.75rem' }} onClick={fixtures.loadProfiles}>↺ Reload</button>
                </div>
                {fixtures.profiles.length === 0 ? (
                  <div className="patch-empty">No profiles saved yet.</div>
                ) : (
                  <div className="profile-list">
                    {fixtures.profiles.map(p => (
                      <div key={p.key} className="profile-list-item">
                        <div className="profile-list-info">
                          <span className="profile-list-name">{p.profile.manufacturer} {p.profile.model}</span>
                          <span className="profile-list-sub">{p.profile.mode} · {p.profile.channels.length} ch</span>
                        </div>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: '0.7rem', color: 'var(--status-error)' }}
                          onClick={() => fixtures.deleteProfile(p.key)}
                          title="Delete profile"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════ PATCH ═══════════════════════════════════════════════════════════ */}
        {currentView === 'patch' && (
          <div className="view-full patch-view">
            <div className="panel patch-panel">
              <PatchGrid
                profiles={fixtures.profiles}
                patch={fixtures.patch}
                onPatch={handlePatch}
                onRemovePatch={fixtures.removePatch}
              />
            </div>
          </div>
        )}

        {/* ════ CONTROL ═════════════════════════════════════════════════════════ */}
        {currentView === 'control' && (
          <div className="view-full" style={{ display: 'flex', flexDirection: 'column' }}>
            <SubmasterConsole />
            <div className="section-title" style={{ padding: '0 1.5rem', paddingTop: '1rem' }}>
              Fixture Controls — {fixtures.patch.length} fixture{fixtures.patch.length !== 1 ? 's' : ''} active
            </div>
            <div className="control-scroll">
              <LogicalControl
                patch={fixtures.patch}
                states={fixtures.states}
                onSendCommand={fixtures.sendCommand}
                onSendColor={fixtures.sendColor}
              />
            </div>
          </div>
        )}

        {/* ════ SCENES ══════════════════════════════════════════════════════════ */}
        {currentView === 'scenes' && (
          <div className="view-full" style={{ display: 'flex', flexDirection: 'column' }}>
            <UndoRedoBar
              canUndo={programmerHistory.canUndo}
              canRedo={programmerHistory.canRedo}
              lastLabel={programmerHistory.lastLabel}
              historySize={programmerHistory.historySize}
              onUndo={programmerHistory.undo}
              onRedo={programmerHistory.redo}
            />
            <div className="scenes-view" style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
              <aside className="scenes-sidebar">
                <div className="panel">
                  <SceneRecorder
                    onSave={handleSaveScene}
                    onClear={sceneState.clearProgrammer}
                  />
                </div>
              </aside>
              <main className="scenes-main">
                <div className="section-title" style={{ paddingBottom: '1rem' }}>
                  Busking Grid
                </div>
                <div className="busking-scroll">
                  <BuskingGrid
                    scenes={sceneState.scenes}
                    activeId={sceneState.activeId}
                    fadeStatus={sceneState.fadeStatus}
                    onRecall={sceneState.recallScene}
                    onDelete={sceneState.deleteScene}
                    onCancelFade={sceneState.cancelFade}
                  />
                </div>
              </main>
            </div>
          </div>
        )}

        {/* ════ CHASERS ══════════════════════════════════════════════════════════ */}
        {currentView === 'chaser' && (
          <div className="view-full chaser-view">
            <ChaserEditor
              chasers={chaserState.chasers}
              scenes={sceneState.scenes}
              status={chaserState.status}
              onSave={chaserState.saveChaser}
              onDelete={chaserState.deleteChaser}
              onStart={chaserState.startChaser}
              onStop={chaserState.stopChaser}
              onSetBpm={chaserState.setBpm}
              onTapTempo={chaserState.tapTempo}
            />
          </div>
        )}

        {/* ════ FX ENGINE ═══════════════════════════════════════════════════════ */}
        {currentView === 'fx' && (
          <div className="view-full">
            <FxGenerator
              patch={fixtures.patch}
              activeEffects={fxState.activeEffects}
              onAddEffect={fxState.addEffect}
              onRemoveEffect={fxState.removeEffect}
            />
          </div>
        )}

        {/* ════ LIVE GRID ═══════════════════════════════════════════════════════ */}
        {currentView === 'live' && (
          <div className="view-full" style={{ padding: '2rem', overflowY: 'auto' }}>
            <LiveGrid
              grid={liveGridState.grid}
              activePage={liveGridState.activePage}
              activeNotes={liveGridState.activeNotes}
              scenes={sceneState.scenes}
              effects={fxState.activeEffects}
              onAssign={liveGridState.assignCell}
              onToggle={liveGridState.toggleNote}
              onSwitchPage={liveGridState.switchPage}
            />
          </div>
        )}


        {/* ════ AUDIO ENGINE ════════════════════════════════════════════════════ */}
        {currentView === 'audio' && (
          <div className="view-full">
            <AudioDashboard patch={fixtures.patch} effects={fxState.activeEffects} />
          </div>
        )}

        {/* ════ PIXEL MAPPER ════════════════════════════════════════════════════ */}
        {currentView === 'pixel' && (
          <div className="view-full">
            <PixelMapper />
          </div>
        )}

        {/* ════ TIMELINE SEQUENCER ══════════════════════════════════════════════ */}
        {currentView === 'timeline' && (
          <div className="view-full">
            <TimelineSequencer />
          </div>
        )}

        {/* ════ VISUALIZER ══════════════════════════════════════════════════════ */}
        {currentView === 'visualizer' && (
          <div className="view-full">
            <StageVisualizer />
          </div>
        )}

      </div>
    </div>
  )
}
