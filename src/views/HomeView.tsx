import React, { useEffect, useState } from 'react'
import { FilePlus, Upload, FolderOpen, Clock, ChevronRight, Zap } from 'lucide-react'

interface RecentShow {
  name: string
  path: string
  lastOpened: number
}

export function HomeView() {
  const [recentShows, setRecentShows] = useState<RecentShow[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
    await window.appAPI.openRecentShow(path)
  }

  return (
    <div className="home-view" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100%',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Gradients */}
      <div style={{
        position: 'absolute',
        top: '-10%', left: '-10%', width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(60px)',
        zIndex: 0,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%', right: '-10%', width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(60px)',
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '1000px',
        display: 'flex',
        flexDirection: 'column',
        gap: '3rem',
      }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(59,130,246,0.2) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '1.5rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <Zap size={40} color="var(--accent)" fill="var(--accent)" />
          </div>
          <h1 style={{ 
            fontSize: '3.5rem', 
            fontWeight: 800, 
            letterSpacing: '-0.02em', 
            marginBottom: '0.5rem',
            background: 'linear-gradient(to right, #fff, #a8a8b0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            DMX Master
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>
            The ultimate modern lighting control software.
          </p>
        </div>

        {/* Content Split */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
        }}>
          {/* Left Column - Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Get Started</h2>
            
            <button 
              className="home-action-btn"
              onClick={() => {
                // Switching to Dashboard will just hide HomeView and show the current project
                document.getElementById('tab-dashboard')?.click()
              }}
              style={actionBtnStyle}
            >
              <div style={iconWrapperStyle('rgba(16, 185, 129, 0.2)', '#10b981')}><FolderOpen size={24} color="#10b981" /></div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Continue Current Show</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Resume working on your active workspace</div>
              </div>
            </button>

            <button 
              className="home-action-btn"
              onClick={() => window.appAPI.newShow()}
              style={actionBtnStyle}
            >
              <div style={iconWrapperStyle('rgba(168, 85, 247, 0.2)', 'var(--accent)')}><FilePlus size={24} color="var(--accent)" /></div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Create New Show</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Start a fresh workspace from scratch</div>
              </div>
            </button>

            <button 
              className="home-action-btn"
              onClick={() => window.appAPI.importShow()}
              style={actionBtnStyle}
            >
              <div style={iconWrapperStyle('rgba(59, 130, 246, 0.2)', '#3b82f6')}><Upload size={24} color="#3b82f6" /></div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Import Show</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Load an existing .dmxshow file</div>
              </div>
            </button>
          </div>

          {/* Right Column - Recent Projects */}
          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '24px',
            padding: '1.5rem',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--text-muted)" /> Recent Shows
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              {isLoading ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Loading...</div>
              ) : recentShows.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0', fontSize: '0.9rem' }}>
                  No recent shows found.<br/>Import or save a show to see it here.
                </div>
              ) : (
                recentShows.map((show, idx) => (
                  <div 
                    key={`${show.path}-${idx}`}
                    className="recent-show-item"
                    onClick={() => handleOpenRecent(show.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      border: '1px solid transparent',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {show.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {show.path}
                      </span>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .home-action-btn:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.15) !important;
          transform: translateY(-2px);
        }
        .recent-show-item:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .recent-show-item:hover svg {
          color: var(--accent) !important;
        }
      `}</style>
    </div>
  )
}

const actionBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '1.25rem',
  padding: '1.25rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: '16px',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  width: '100%',
}

const iconWrapperStyle = (bg: string, border: string) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '50px',
  height: '50px',
  borderRadius: '12px',
  background: bg,
  border: `1px solid ${border}`,
  flexShrink: 0,
})
