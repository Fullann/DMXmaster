import { useState, useEffect } from 'react'

import { useGlobalShortcuts }   from '@/hooks/useGlobalShortcuts'
import '@/styles/index.css'
import { 
  Grid, LayoutDashboard, Folder, Cable, SlidersHorizontal, 
  Clapperboard, Repeat, Waves, Mic, Tv, Clock, Eye,
  FilePlus, Download, Upload, Zap, Palette, Settings2, Wrench, Target, Home, Search, ListMusic
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

  return (
    <div className="app-shell">
      <MidiListener />
      <DmxListener />
      <MidiFeedbackEngine />
      {/* ── Sidebar Navigation (Formerly Tab Navigation) ────────────────────── */}
      <nav className="tab-nav">
        {/* Logo at the top of the sidebar */}
        <div className="topbar-logo" style={{ padding: '0.5rem 0.75rem', marginBottom: '1rem', WebkitAppRegion: 'drag' } as any}>
          <div className="topbar-logo-icon" style={{ display: 'flex', alignItems: 'center' }}>
            <Zap size={20} color="var(--accent)" fill="var(--accent)" />
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
        {/* ── Top Bar (Badges & Controls Only) ──────────────────────────────── */}
        <header className="topbar">
          
          <div className="topbar-badges" style={{ marginLeft: 'auto', marginRight: '1rem' }}>
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
            {isSerialConnected ? (
              <div className="topbar-badge badge-connected">
                <span className="badge-dot" />
                {serialPort.split('/').pop() ?? serialPort}
              </div>
            ) : (
              <div className="topbar-badge badge-disconnected">
                <span className="badge-dot" />
                No Device
              </div>
            )}
            {lastBackupTime && (
              <div className="topbar-badge badge-connected" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#d8b4fe', border: '1px solid rgba(168, 85, 247, 0.2)' }} title="Auto-Save Background Backup">
                <span className="badge-dot" style={{ background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} />
                Saved {new Date(lastBackupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          
          {/* Workspace Mode Selector */}
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-dark)', padding: '4px', borderRadius: '12px' }}>
            <button 
              className={`btn ${workspaceMode === 'setup' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
              onClick={() => handleWorkspaceChange('setup')}
            >
              SETUP
            </button>
            <button 
              className={`btn ${workspaceMode === 'program' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
              onClick={() => handleWorkspaceChange('program')}
            >
              PROGRAM
            </button>
            <button 
              className={`btn ${workspaceMode === 'playback' ? 'btn-danger' : 'btn-ghost'}`}
              style={{ padding: '6px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
              onClick={() => handleWorkspaceChange('playback')}
            >
              PLAYBACK
            </button>
          </div>

          {/* Global Controls & File Management */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            
            <div style={{ display: 'flex', gap: '0.5rem', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '1rem' }}>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => window.appAPI.newShow()}>
                <FilePlus size={14} /> New Show
              </button>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => window.appAPI.importShow()}>
                <Upload size={14} /> Import
              </button>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => window.appAPI.exportShow()}>
                <Download size={14} /> Export
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                className={`btn ${isBlindMode ? 'btn-danger' : 'btn-ghost'}`}
                style={{ 
                  padding: '4px 16px', 
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: isBlindMode ? '#e74c3c' : 'rgba(255,255,255,0.05)',
                  color: isBlindMode ? 'white' : 'inherit'
                }}
                onClick={() => setBlindMode(!isBlindMode)}
                title="Program on Visualizer only"
              >
                <Eye size={14} /> BLIND
              </button>
              
              <div className={`status-badge ${isBroadcastEnabled ? 'status-connected' : 'status-disconnected'}`} 
                   style={{ cursor: 'pointer', padding: '0.35rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px' }}
                   onClick={() => toggleBroadcast(!isBroadcastEnabled)}
                   title="Toggle Art-Net Broadcast"
              >
                <div className="status-dot"></div>
                Network: {isBroadcastEnabled ? 'ON' : 'OFF'}
              </div>
              <div className={`status-badge ${isSerialConnected ? 'status-connected' : 'status-disconnected'}`} style={{ padding: '0.35rem 0.85rem', borderRadius: '12px' }}>
                <div className="status-dot"></div>
                {isSerialConnected ? 'USB DMX Active' : 'USB DMX Offline'}
              </div>
            </div>
          </div>
        </header>

        {/* ── Content View ─────────────────────────────────────────────────── */}
        <div className="content-area" style={{ paddingBottom: '56px' }}>
          {currentView === 'home' && <HomeView />}
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'library' && <LibraryView />}
          {currentView === 'patch' && <PatchView />}
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
        </div>
        
        {/* ── Global Master Toolbar (Bottom) ────────────────────────────────── */}
        <GlobalMasterToolbar />
      </div>
    </div>
  )
}
