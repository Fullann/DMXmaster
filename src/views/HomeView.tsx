import { useEffect, useState } from 'react'
import { FilePlus, Upload, Download, FolderOpen, Clock, ChevronRight, Zap, Code, Box, Layers, Cpu } from 'lucide-react'
import { useFixturesStore } from '@/store/useFixturesStore'
import { useScenesStore } from '@/store/useScenesStore'

interface RecentShow {
  name: string
  path: string
  lastOpened: number
}

export function HomeView() {
  const [recentShows, setRecentShows] = useState<RecentShow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const patchCount = useFixturesStore(s => s.patch.length)
  const profilesCount = useFixturesStore(s => s.profiles.length)
  const scenesCount = useScenesStore(s => s.scenes.length)

  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await window.appAPI.getRecentShows()
        if (res.success && res.shows) {
          setRecentShows(res.shows)
        }
      } catch (err) {
        console.error("Failed to load recent shows:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadRecent()
  }, [])

  const handleOpenRecent = async (path: string) => {
    const res = await window.appAPI.openRecentShow(path)
    if (res && !res.success && res.error) {
      alert(`Could not open recent show:\n${res.error}`)
    }
  }

  const handleOpenGithub = () => {
    window.open('https://github.com/Fullann', '_blank')
  }

  return (
    <div className="home-view">
      {/* Background Gradients */}
      <div className="home-bg home-bg-purple" />
      <div className="home-bg home-bg-blue" />

      <div className="home-content">
        {/* Header */}
        <div className="home-header">
          <div className="home-logo-icon">
            <Zap size={36} color="var(--accent)" fill="var(--accent)" />
          </div>
          <h1 className="home-title">DMX Master</h1>
          <p className="home-subtitle">Bienvenue ! Prêt à illuminer la scène ? 🚀</p>
        </div>

        {/* Dashboard Stats */}
        <div className="home-stats-grid">
          <div className="home-stat-card">
            <div className="home-stat-icon" style={{ color: '#32d74b', background: 'rgba(50, 215, 75, 0.1)' }}>
              <Box size={24} />
            </div>
            <div className="home-stat-info">
              <span className="home-stat-value">{patchCount}</span>
              <span className="home-stat-label">Projecteurs Patchés</span>
            </div>
          </div>
          <div className="home-stat-card">
            <div className="home-stat-icon" style={{ color: '#5E5CE6', background: 'rgba(94, 92, 230, 0.1)' }}>
              <Layers size={24} />
            </div>
            <div className="home-stat-info">
              <span className="home-stat-value">{scenesCount}</span>
              <span className="home-stat-label">Scènes Créées</span>
            </div>
          </div>
          <div className="home-stat-card">
            <div className="home-stat-icon" style={{ color: '#bf5af2', background: 'rgba(191, 90, 242, 0.1)' }}>
              <Cpu size={24} />
            </div>
            <div className="home-stat-info">
              <span className="home-stat-value">{profilesCount}</span>
              <span className="home-stat-label">Profils Sauvegardés</span>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="home-grid">
          {/* Left — Actions */}
          <div className="home-actions">
            <h2 className="home-section-title">Get Started</h2>
            
            <div className="home-actions-list">
              <button className="home-action-btn" onClick={() => document.getElementById('tab-dashboard')?.click()}>
                <div className="home-action-icon" style={{ background: 'rgba(50, 215, 75, 0.1)', borderColor: 'rgba(50, 215, 75, 0.25)' }}>
                  <FolderOpen size={22} color="#32d74b" />
                </div>
                <div className="home-action-text">
                  <span className="home-action-title">Continue Current Show</span>
                  <span className="home-action-desc">Resume working on your active workspace</span>
                </div>
              </button>

              <button className="home-action-btn" onClick={() => window.appAPI.newShow()}>
                <div className="home-action-icon" style={{ background: 'rgba(10, 132, 255, 0.1)', borderColor: 'rgba(10, 132, 255, 0.25)' }}>
                  <FilePlus size={22} color="var(--accent)" />
                </div>
                <div className="home-action-text">
                  <span className="home-action-title">Create New Show</span>
                  <span className="home-action-desc">Start a fresh workspace from scratch</span>
                </div>
              </button>

              <button className="home-action-btn" onClick={() => window.appAPI.importShow()}>
                <div className="home-action-icon" style={{ background: 'rgba(94, 92, 230, 0.1)', borderColor: 'rgba(94, 92, 230, 0.25)' }}>
                  <Upload size={22} color="#5E5CE6" />
                </div>
                <div className="home-action-text">
                  <span className="home-action-title">Import Show</span>
                  <span className="home-action-desc">Load an existing .dmxshow file</span>
                </div>
              </button>

              <button className="home-action-btn" onClick={() => window.appAPI.exportShow()}>
                <div className="home-action-icon" style={{ background: 'rgba(191, 90, 242, 0.1)', borderColor: 'rgba(191, 90, 242, 0.25)' }}>
                  <Download size={22} color="#bf5af2" />
                </div>
                <div className="home-action-text">
                  <span className="home-action-title">Export Show</span>
                  <span className="home-action-desc">Save your current project as a file</span>
                </div>
              </button>
            </div>
          </div>

          {/* Right — Recent Shows */}
          <div className="home-recent">
            <h2 className="home-section-title">
              <Clock size={15} color="var(--text-muted)" /> Recent Shows
            </h2>
            
            <div className="home-recent-list">
              {isLoading ? (
                <div className="home-recent-empty">Loading...</div>
              ) : recentShows.length === 0 ? (
                <div className="home-recent-empty">
                  No recent shows found.<br/>Import or save a show to see it here.
                </div>
              ) : (
                recentShows.map((show, idx) => (
                  <div 
                    key={`${show.path}-${idx}`}
                    className="home-recent-item"
                    onClick={() => handleOpenRecent(show.path)}
                  >
                    <div className="home-recent-info">
                      <span className="home-recent-name">{show.name}</span>
                      <span className="home-recent-path">{show.path}</span>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="home-footer" onClick={handleOpenGithub}>
          <Code size={16} />
          <span>Developed by <strong>Fullann</strong></span>
        </div>
      </div>

      <style>{`
        .home-view {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 100%;
          padding: var(--space-6);
          position: relative;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .home-bg {
          position: absolute;
          width: 45vw;
          height: 45vw;
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          pointer-events: none;
          opacity: 0.6;
        }
        .home-bg-purple {
          top: -15%;
          left: -10%;
          background: radial-gradient(circle, rgba(94, 92, 230, 0.15) 0%, transparent 70%);
        }
        .home-bg-blue {
          bottom: -15%;
          right: -10%;
          background: radial-gradient(circle, rgba(10, 132, 255, 0.12) 0%, transparent 70%);
        }
        .home-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 900px;
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }
        .home-header {
          text-align: center;
          margin-bottom: var(--space-2);
        }
        .home-logo-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: var(--radius-xl);
          background: var(--surface-2);
          border: 1px solid var(--border-light);
          margin-bottom: var(--space-4);
        }
        .home-title {
          font-size: 2.4rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: var(--space-2);
          background: linear-gradient(to right, #fff, rgba(255,255,255,0.6));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .home-subtitle {
          font-size: var(--text-sm);
          color: var(--text-muted);
        }
        
        .home-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
        }
        @media (max-width: 768px) {
          .home-stats-grid {
            grid-template-columns: 1fr;
          }
        }
        .home-stat-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          display: flex;
          align-items: center;
          gap: var(--space-4);
          transition: transform var(--duration-fast) ease, border-color var(--duration-fast) ease;
        }
        .home-stat-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-light);
          background: var(--surface-1);
        }
        .home-stat-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .home-stat-info {
          display: flex;
          flex-direction: column;
        }
        .home-stat-value {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
        }
        .home-stat-label {
          font-size: var(--text-xs);
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 6px;
        }

        .home-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-5);
        }
        @media (max-width: 768px) {
          .home-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .home-section-title {
          font-size: var(--text-md);
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--space-3);
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .home-actions {
          display: flex;
          flex-direction: column;
        }
        .home-actions-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
        }
        @media (max-width: 900px) {
          .home-actions-list {
            grid-template-columns: 1fr;
          }
        }
        
        .home-action-btn {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out);
          width: 100%;
          text-align: left;
        }
        .home-action-btn:hover {
          background: var(--surface-2);
          border-color: var(--border-light);
          transform: translateY(-1px);
        }
        .home-action-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          border: 1px solid;
          flex-shrink: 0;
        }
        .home-action-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .home-action-title {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
        }
        .home-action-desc {
          font-size: 0.65rem;
          color: var(--text-muted);
          line-height: 1.2;
        }
        .home-recent {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          min-height: 250px;
        }
        .home-recent-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          overflow-y: auto;
          flex: 1;
        }
        .home-recent-empty {
          color: var(--text-muted);
          text-align: center;
          padding: var(--space-7) 0;
          font-size: var(--text-sm);
          line-height: 1.6;
        }
        .home-recent-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-3);
          background: transparent;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--duration-fast) ease;
        }
        .home-recent-item:hover {
          background: var(--bg-hover);
        }
        .home-recent-item:hover svg {
          color: var(--accent) !important;
        }
        .home-recent-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }
        .home-recent-name {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
        }
        .home-recent-path {
          font-size: var(--text-xs);
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .home-footer {
          margin-top: var(--space-4);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          color: var(--text-muted);
          font-size: var(--text-xs);
          padding-top: var(--space-4);
          border-top: 1px solid var(--border);
          cursor: pointer;
          transition: color var(--duration-fast) ease;
        }
        .home-footer:hover {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  )
}
