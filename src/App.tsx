import { useState, useEffect } from 'react'

import { useGlobalShortcuts }   from '@/hooks/useGlobalShortcuts'
import '@/styles/index.css'
import { 
  Grid, LayoutDashboard, Folder, Cable, SlidersHorizontal, 
  Clapperboard, Repeat, Waves, Mic, Tv, Clock, Eye,
  FilePlus, Download, Upload, Zap, Palette, Settings2, Wrench, Target, Home, Search, ListMusic, Users
} from 'lucide-react'

// Stores
import { useSerialStore } from '@/store/useSerialStore'
import { GlobalTopbar } from './components/layout/GlobalTopbar'
import { GlobalMasterToolbar } from './components/layout/GlobalMasterToolbar'
import { MidiListener }   from '@/components/midi/MidiListener'
import { DmxListener }    from '@/components/midi/DmxListener'
import { MidiFeedbackEngine } from '@/components/midi/MidiFeedbackEngine'
import { useDmxStore } from '@/store/useDmxStore'
import { useMidiStore } from '@/store/useMidiStore'
import { useFixturesStore } from '@/store/useFixturesStore'
import { useScenesStore } from '@/store/useScenesStore'
import { useChaserStore } from '@/store/useChaserStore'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useFxStore } from '@/store/useFxStore'
import { useLiveGridStore } from '@/store/useLiveGridStore'
import { useNetworkStore } from '@/store/useNetworkStore'
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Views
import { HomeView }       from '@/views/HomeView'
import { DashboardView }  from '@/views/DashboardView'
import { LibraryView }    from '@/views/LibraryView'
import { PatchView }      from '@/views/PatchView'
import { PaletteView }    from '@/views/PaletteView'
import { ControlView }    from '@/views/ControlView'
import { MovementView }   from '@/views/MovementView'
import { ScenesView }     from '@/views/ScenesView'
import { ChaserView }     from '@/views/ChaserView'
import { FxView }         from '@/views/FxView'
import { LiveView }       from '@/views/LiveView'
import { AudioView }      from '@/views/AudioView'
import { PixelView }      from '@/views/PixelView'
import { TimelineView }   from '@/views/TimelineView'
import { VisualizerView } from '@/views/VisualizerView'
import { MidiView }       from '@/views/MidiView'
import { GroupsView }     from '@/views/GroupsView'
import { VirtualConsoleView } from '@/views/VirtualConsoleView'
import { CuelistView }    from '@/views/CuelistView'
import { RdmView }        from '@/views/RdmView'

// ─────────────────────────────────────────────────────────────────────────────
// App — root component with tab navigation
// ─────────────────────────────────────────────────────────────────────────────

type TabGroup = {
  label: string;
  items: { id: string; label: string; icon: React.ReactNode }[];
}

type WorkspaceMode = 'setup' | 'program' | 'playback'

const WORKSPACE_TABS: Record<WorkspaceMode, TabGroup[]> = {
  setup: [
    {
      label: 'Setup',
      items: [
        { id: 'home',      label: 'Home',         icon: <Home size={18} /> },
        { id: 'patch',     label: 'Patch',        icon: <Cable size={18} /> },
        { id: 'library',   label: 'Library',      icon: <Folder size={18} /> },
        { id: 'visualizer',label: '3D View',      icon: <Eye size={18} /> },
        { id: 'rdm',       label: 'Network & RDM',icon: <Search size={18} /> },
        { id: 'midi',      label: 'MIDI Mapping', icon: <Settings2 size={18} /> },
      ]
    }
  ],
  program: [
    {
      label: 'Programming',
      items: [
        { id: 'dashboard', label: 'Dashboard',    icon: <LayoutDashboard size={18} /> },
        { id: 'groups',    label: 'Groups',       icon: <Users size={18} /> },
        { id: 'control',   label: 'Control',      icon: <SlidersHorizontal size={18} /> },
        { id: 'palette',   label: 'Palettes',     icon: <Palette size={18} /> },
        { id: 'pixel',     label: 'Pixel Mapper', icon: <Tv size={18} /> },
        { id: 'fx',        label: 'FX Generator', icon: <Waves size={18} /> },
      ]
    }
  ],
  playback: [
    {
      label: 'Playback & Live',
      items: [
        { id: 'live',      label: 'Live Grid',    icon: <Grid size={18} /> },
        { id: 'console',   label: 'Virtual Console', icon: <SlidersHorizontal size={18} /> },
        { id: 'cuelist',   label: 'Cuelist',      icon: <ListMusic size={18} /> },
        { id: 'movement',  label: 'Follow Spot',  icon: <Target size={18} /> },
        { id: 'scenes',    label: 'Scenes',       icon: <Clapperboard size={18} /> },
        { id: 'chaser',    label: 'Chasers',      icon: <Repeat size={18} /> },
        { id: 'timeline',  label: 'Timeline',     icon: <Clock size={18} /> },
        { id: 'audio',     label: 'Audio Input',  icon: <Mic size={18} /> },
        { id: 'visualizer',label: '3D View',      icon: <Eye size={18} /> },
      ]
    }
  ]
}

function GlobalAudioListener() {
  const { startListening, stopListening, isListening, setAutoBpmEnabled } = useAudioAnalyzer()
  
  useEffect(() => {
    if (window.appAPI && window.appAPI.onToggleMicFromMobile) {
      window.appAPI.onToggleMicFromMobile((enabled) => {
        if (enabled) {
          startListening()
          setAutoBpmEnabled(true)
        } else {
          stopListening()
          setAutoBpmEnabled(false)
        }
      })
    }
  }, [startListening, stopListening, setAutoBpmEnabled])
  
  return null
}

export default function App() {
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('setup')
  const [currentView, setCurrentView] = useState<string>('home')
  const [lastBackupTime, setLastBackupTime] = useState<number | null>(null)
  
  useEffect(() => {
    if (window.appAPI && window.appAPI.onBackupComplete) {
      window.appAPI.onBackupComplete((timeMs) => {
        setLastBackupTime(timeMs)
      })
    }
  }, [])
  
  const handleWorkspaceChange = (mode: WorkspaceMode) => {
    setWorkspaceMode(mode)
    setCurrentView(WORKSPACE_TABS[mode][0].items[0].id)
  }
  
  // Detached window mode
  const [isDetachedVisualizer] = useState(() => window.location.hash === '#visualizer')

  // We only subscribe to topbar-specific data to avoid re-renders!
  const isSerialConnected = useSerialStore(s => s.isConnected)
  const serialPort = useSerialStore(s => s.selectedPort)
  const patchCount = useFixturesStore(s => s.patch.length)
  const isBroadcastEnabled = useNetworkStore(s => s.config.broadcastEnabled)
  const toggleBroadcast = useNetworkStore(s => s.setBroadcastEnabled)
  const isBlindMode = useDmxStore(s => s.isBlindMode)
  const setBlindMode = useDmxStore(s => s.setBlindMode)

  // ── Global Initialisation ────────────────────────────────────────────────────
  useEffect(() => {
    useSerialStore.getState().init()
    const unsubDmx = useDmxStore.getState().init()
    const unsubMidi = useMidiStore.getState().init()
    useFixturesStore.getState().init()
    useScenesStore.getState().init()
    useChaserStore.getState().init()
    useFxStore.getState().init()
    useLiveGridStore.getState().init()
    useNetworkStore.getState().init()

    return () => {
      unsubDmx()
      unsubMidi()
    }
  }, [])

  // ── MIDI Bridge ─────────────────────────────────────────────────────────────
  // Keep the MIDI -> DMX Channel 1 bridge at the root level so it works across all tabs
  const midiLastMessage = useMidiStore(s => s.lastMessage)
  useEffect(() => {
    if (!midiLastMessage) return
    const updateChannel = useDmxStore.getState().updateChannel
    if (midiLastMessage.type === 'noteOn')  updateChannel(1, 255)
    if (midiLastMessage.type === 'noteOff') updateChannel(1, 0)
    
    // Also feed Live Grid
    if (midiLastMessage.type === 'noteOn' && midiLastMessage.velocity > 0) {
      const note = midiLastMessage.note
      if (note >= 0 && note < 64) {
        useLiveGridStore.getState().toggleNote(note)
      }
    }
  }, [midiLastMessage])

  useGlobalShortcuts({
    onSoftBlackout:    () => window.dmxAPI.softBlackout(),
    onTriggerFirstRow: (col) => useLiveGridStore.getState().triggerFirstRow(col),
    onSwitchPage:      (page) => useLiveGridStore.getState().switchPage(page),
  })

  // ── Detached Window Render ──────────────────────────────────────────────────
  if (isDetachedVisualizer) {
    return (
      <div className="app-shell" style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <MidiListener />
        <DmxListener />
        <div style={{ WebkitAppRegion: 'drag', height: '38px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999 } as any} />
        <VisualizerView />
      </div>
    )
  }

  // Find the current tab label for breadcrumb
  const currentTabLabel = WORKSPACE_TABS[workspaceMode]
    .flatMap(g => g.items)
    .find(t => t.id === currentView)?.label ?? currentView

  return (
    <div className="app-shell">
      <MidiListener />
      <DmxListener />
      <MidiFeedbackEngine />
      <GlobalAudioListener />

      {/* ── Sidebar Navigation ──────────────────────────────────────────────── */}
      <nav className="tab-nav">
        {/* Logo */}
        <div className="topbar-logo" style={{ WebkitAppRegion: 'drag' } as any}>
          <div className="topbar-logo-icon">
            <Zap size={16} color="#fff" fill="#fff" />
          </div>
          <span className="topbar-logo-text">DMX Master</span>
        </div>

        {WORKSPACE_TABS[workspaceMode].map(group => (
          <div key={group.label} className="tab-group">
            <div className="tab-group-label">{group.label}</div>
            {group.items.map(tab => (
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
          </div>
        ))}
      </nav>

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <div className="app-content-wrap">
        {/* ── Top Bar ──────────────────────────────────────────────────────── */}
        <header className="topbar">
          {/* Breadcrumb */}
          <div className="topbar-breadcrumb">
            <span>{workspaceMode.toUpperCase()}</span>
            <span className="topbar-breadcrumb-sep">›</span>
            <span className="topbar-breadcrumb-current">{currentTabLabel}</span>
          </div>

          {/* Status Badges */}
          <div className="topbar-status">
            <div className="topbar-badges">
              <div className="topbar-badge badge-engine">
                <span className="badge-dot pulse" />
                Engine
              </div>
              {patchCount > 0 && (
                <div className="topbar-badge badge-connected">
                  <span className="badge-dot" />
                  {patchCount} Fix
                </div>
              )}
              {isSerialConnected ? (
                <div className="topbar-badge badge-connected">
                  <span className="badge-dot" />
                  {serialPort.split('/').pop() ?? 'USB'}
                </div>
              ) : (
                <div className="topbar-badge badge-disconnected">
                  <span className="badge-dot" />
                  No USB
                </div>
              )}
              {lastBackupTime && (
                <div className="topbar-badge badge-connected">
                  <span className="badge-dot" />
                  Saved {new Date(lastBackupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            <div className="topbar-divider" />

            {/* Workspace Mode Selector */}
            <div className="workspace-selector">
              <button 
                className={`workspace-btn ${workspaceMode === 'setup' ? 'active' : ''}`}
                onClick={() => handleWorkspaceChange('setup')}
              >
                Setup
              </button>
              <button 
                className={`workspace-btn ${workspaceMode === 'program' ? 'active' : ''}`}
                onClick={() => handleWorkspaceChange('program')}
              >
                Program
              </button>
              <button 
                className={`workspace-btn ${workspaceMode === 'playback' ? 'active-playback' : ''}`}
                onClick={() => handleWorkspaceChange('playback')}
              >
                Playback
              </button>
            </div>

            <div className="topbar-divider" />

            {/* Global Controls */}
            <div className="topbar-actions">
              <button 
                className={`topbar-icon-btn ${isBlindMode ? 'danger-active' : ''}`}
                onClick={() => setBlindMode(!isBlindMode)}
                title="Program on Visualizer only"
              >
                <Eye size={13} /> BLIND
              </button>
              <button 
                className="topbar-icon-btn"
                onClick={() => toggleBroadcast(!isBroadcastEnabled)}
                title="Toggle Art-Net Broadcast"
              >
                <span className={`badge-dot ${isBroadcastEnabled ? 'pulse' : ''}`} 
                      style={{ background: isBroadcastEnabled ? 'var(--status-ok)' : 'var(--text-muted)' }} />
                Net
              </button>
            </div>
          </div>
        </header>

        {/* ── Content View ─────────────────────────────────────────────────── */}
        <div className="content-area" style={{ paddingBottom: 'var(--toolbar-h)' }}>
          <ErrorBoundary key={currentView}>
            {currentView === 'home' && <HomeView />}
            {currentView === 'dashboard' && <DashboardView />}
            {currentView === 'library' && <LibraryView />}
            {currentView === 'patch' && <PatchView />}
            {currentView === 'groups' && <GroupsView />}
            {currentView === 'palette' && <PaletteView />}
            {currentView === 'control' && <ControlView />}
            {currentView === 'movement' && <MovementView />}
            {currentView === 'scenes' && <ScenesView />}
            {currentView === 'chaser' && <ChaserView />}
            {currentView === 'console' && <VirtualConsoleView />}
            {currentView === 'cuelist' && <CuelistView />}
            {currentView === 'fx' && <FxView />}
            {currentView === 'live' && <LiveView />}
            {currentView === 'audio' && <AudioView />}
            {currentView === 'pixel' && <PixelView />}
            {currentView === 'timeline' && <TimelineView />}
            {currentView === 'visualizer' && <VisualizerView />}
            {currentView === 'midi' && <MidiView />}
            {currentView === 'rdm' && <RdmView />}
          </ErrorBoundary>
        </div>
        
        {/* ── Global Master Toolbar (Bottom) ────────────────────────────────── */}
        <GlobalMasterToolbar />
      </div>
    </div>
  )
}
