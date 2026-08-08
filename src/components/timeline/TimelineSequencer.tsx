import { useState, useRef, useEffect, MouseEvent } from 'react'
import { useTimeline } from '@/hooks/useTimeline'
import { useScenes } from '@/hooks/useScenes'
import { useFx } from '@/hooks/useFx'

export function TimelineSequencer() {
  const tl = useTimeline()
  const scenes = useScenes()
  const fx = useFx()
  
  const [newShowName, setNewShowName] = useState('')
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)
  
  // Waveform drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (tl.waveform && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (!ctx) return
      
      const width = canvasRef.current.width
      const height = canvasRef.current.height
      
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#3b82f6' // tailwind blue-500
      
      const buckets = tl.waveform.length
      const barWidth = width / buckets
      
      for (let i = 0; i < buckets; i++) {
        const val = tl.waveform[i]
        const barHeight = val * height
        ctx.fillRect(i * barWidth, (height - barHeight) / 2, barWidth, barHeight)
      }
    }
  }, [tl.waveform])

  const handleAudioImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      tl.importAudio(e.target.files[0].path) // .path is an Electron File object extension
    }
  }

  // Calculate pixel positions for the timeline UI
  const timelineWidth = 800 // Fixed px width for MVP scrolling
  const pxPerMs = timelineWidth / (tl.activeShow?.durationMs || 60000)
  
  const playheadX = tl.currentTimeMs * pxPerMs

  const handleTimelineClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!tl.activeShow) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ms = x / pxPerMs
    tl.scrub(ms)
  }

  const handleTrackClick = (e: MouseEvent<HTMLDivElement>, trackId: string) => {
    if (!tl.activeShow) return
    // Prevent event bubbling so it doesn't trigger scrub
    e.stopPropagation()
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ms = Math.floor(x / pxPerMs)
    
    // Quick prompt for MVP event creation
    // In a real app this would be a nice floating contextual menu
    const type = window.prompt('Action type? (1 = Scene, 2 = FX)', '1')
    if (type === '1') {
      if (scenes.scenes.length === 0) return alert('No scenes exist!')
      // Just pick the first scene for demo
      tl.addEvent(trackId, ms, 'recallScene', scenes.scenes[0].id)
    } else if (type === '2') {
      if (fx.effects.length === 0) return alert('No FX exist!')
      tl.addEvent(trackId, ms, 'triggerFx', fx.effects[0].id)
    }
  }

  return (
    <div className="timeline-view" style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <div className="panel" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <select 
          className="styled-input" 
          value={tl.activeShow?.id || ''} 
          onChange={e => {
            const s = tl.shows.find(x => x.id === e.target.value)
            if (s) tl.setActiveShow(s)
          }}
        >
          <option value="" disabled>-- Select Show --</option>
          {tl.shows.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <input type="text" className="styled-input" placeholder="New Show Name" value={newShowName} onChange={e => setNewShowName(e.target.value)} />
        <button className="btn btn-ghost" onClick={() => { tl.createShow(newShowName); setNewShowName('') }}>New</button>
        
        {tl.activeShow && (
          <>
            <button className="btn btn-ghost" onClick={tl.saveActiveShow}>Save Show</button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
              <input type="file" id="audio-import" style={{ display: 'none' }} accept="audio/*" onChange={handleAudioImport} />
              <label htmlFor="audio-import" className="btn btn-ghost" style={{ cursor: 'pointer' }}>Import MP3/WAV</label>
            </div>
          </>
        )}
      </div>

      {/* ── Transport Controls ─────────────────────────────────────────────── */}
      {tl.activeShow && (
        <div className="panel" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={tl.stop}>⏹ Stop</button>
          {tl.isPlaying ? (
            <button className="btn btn-primary" onClick={tl.pause}>⏸ Pause</button>
          ) : (
            <button className="btn btn-primary" onClick={tl.play}>▶ Play</button>
          )}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', padding: '0.5rem' }}>
            {(tl.currentTimeMs / 1000).toFixed(3)}s / {(tl.activeShow.durationMs / 1000).toFixed(3)}s
          </div>
        </div>
      )}

      {/* ── Sequencer Grid ─────────────────────────────────────────────────── */}
      {tl.activeShow && (
        <div className="panel" style={{ flex: 1, overflowX: 'auto', position: 'relative' }}>
          <div style={{ width: `${timelineWidth}px`, minHeight: '300px', position: 'relative' }}>
            
            {/* Playhead */}
            <div 
              style={{
                position: 'absolute',
                left: `${playheadX}px`,
                top: 0,
                bottom: 0,
                width: '2px',
                backgroundColor: 'var(--error)',
                zIndex: 10,
                pointerEvents: 'none'
              }}
            />

            {/* Time Ruler & Waveform */}
            <div 
              style={{ height: '80px', borderBottom: '1px solid var(--border)', position: 'relative', cursor: 'text' }}
              onClick={handleTimelineClick}
            >
              <canvas ref={canvasRef} width={timelineWidth} height={80} style={{ position: 'absolute', top: 0, left: 0 }} />
            </div>

            {/* Tracks */}
            {tl.activeShow.tracks.map(track => (
              <div 
                key={track.id} 
                style={{ 
                  height: '60px', 
                  borderBottom: '1px solid rgba(255,255,255,0.05)', 
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.2)',
                  cursor: 'crosshair'
                }}
                onClick={(e) => handleTrackClick(e, track.id)}
              >
                <div style={{ position: 'absolute', left: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {track.name}
                </div>

                {track.events.map(ev => {
                  const xPos = ev.timestampMs * pxPerMs
                  let label = '?'
                  if (ev.action === 'recallScene') label = scenes.scenes.find(s => s.id === ev.payloadId)?.name || 'Scene'
                  if (ev.action === 'triggerFx') label = fx.effects.find(f => f.id === ev.payloadId)?.config.target || 'FX'

                  return (
                    <div 
                      key={ev.id}
                      style={{
                        position: 'absolute',
                        left: `${xPos}px`,
                        transform: 'translateX(-50%)',
                        background: ev.action === 'recallScene' ? 'var(--primary)' : 'var(--accent)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm('Delete this trigger?')) {
                          tl.removeEvent(track.id, ev.id)
                        }
                      }}
                    >
                      {label}
                    </div>
                  )
                })}
              </div>
            ))}

          </div>
        </div>
      )}

    </div>
  )
}
