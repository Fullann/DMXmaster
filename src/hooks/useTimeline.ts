import type { Show, ShowEvent } from '@/types/timeline'
import { useMidiStore } from '@/store/useMidiStore'

export function useTimeline() {
  const [shows, setShows] = useState<Show[]>([])
  const [activeShow, setActiveShow] = useState<Show | null>(null)
  
  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false)
  const [syncMode, setSyncMode] = useState<'internal' | 'mtc'>('internal')
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [waveform, setWaveform] = useState<Float32Array | null>(null)
  
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  
  const startTimeRef = useRef<number>(0)
  const rafRef = useRef<number>(0)
  const lastElapsedMsRef = useRef<number>(0)
  
  // Tracking which events have fired
  const firedEventsRef = useRef<Set<string>>(new Set())

  const loadShows = useCallback(async () => {
    const res = await window.timelineAPI.getShows()
    if (res.success && res.shows) setShows(res.shows)
  }, [])

  useEffect(() => { loadShows() }, [loadShows])

  // ── Show Management ─────────────────────────────────────────────────────────

  const createShow = useCallback(async (name: string) => {
    const newShow: Show = {
      id: crypto.randomUUID(),
      name,
      audioFileName: null,
      durationMs: 60000, // Default 1 min if no audio
      tracks: [
        { id: crypto.randomUUID(), name: 'Lights', events: [] },
        { id: crypto.randomUUID(), name: 'Effects', events: [] }
      ]
    }
    await window.timelineAPI.saveShow(newShow)
    loadShows()
    setActiveShow(newShow)
  }, [loadShows])

  const saveActiveShow = useCallback(async () => {
    if (activeShow) {
      await window.timelineAPI.saveShow(activeShow)
      loadShows()
    }
  }, [activeShow, loadShows])

  const importAudio = useCallback(async (filePath: string) => {
    if (!activeShow) return
    const res = await window.timelineAPI.importAudio(filePath)
    if (res.success && res.fileName) {
      const updated = { ...activeShow, audioFileName: res.fileName }
      setActiveShow(updated)
      await window.timelineAPI.saveShow(updated)
      await loadAudioBuffer(res.fileName)
    }
  }, [activeShow])

  // ── Audio Engine ────────────────────────────────────────────────────────────

  const loadAudioBuffer = useCallback(async (fileName: string) => {
    const res = await window.timelineAPI.getAudioBuffer(fileName)
    if (res.success && res.buffer) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      
      const ctx = audioCtxRef.current
      try {
        const decoded = await ctx.decodeAudioData(res.buffer)
        audioBufferRef.current = decoded
        
        if (activeShow) {
          const durMs = Math.floor(decoded.duration * 1000)
          setActiveShow(prev => prev ? { ...prev, durationMs: durMs } : prev)
        }
        
        // Generate waveform data (decimate down to ~2000 points for canvas)
        const channelData = decoded.getChannelData(0)
        const buckets = 2000
        const step = Math.floor(channelData.length / buckets)
        const peaks = new Float32Array(buckets)
        for (let i = 0; i < buckets; i++) {
          let max = 0
          for (let j = 0; j < step; j++) {
            const val = Math.abs(channelData[(i * step) + j])
            if (val > max) max = val
          }
          peaks[i] = max
        }
        setWaveform(peaks)
      } catch (e) {
        console.error('[useTimeline] Decode error:', e)
      }
    }
  }, [activeShow])

  // Automatically load buffer when active show changes
  useEffect(() => {
    if (activeShow?.audioFileName && !audioBufferRef.current) {
      loadAudioBuffer(activeShow.audioFileName)
    }
  }, [activeShow, loadAudioBuffer])

  // ── Playback Loop ───────────────────────────────────────────────────────────

  const loop = useCallback(() => {
    if (syncMode === 'internal' && (!audioCtxRef.current || !isPlaying)) return

    let elapsedMs = 0

    if (syncMode === 'mtc') {
      const midiState = useMidiStore.getState()
      elapsedMs = midiState.mtcTimeMs
      
      // If MTC drops, we can optionally stop, but for now we just hold the last time.
    } else {
      // Calculate current time
      const elapsedSeconds = audioCtxRef.current!.currentTime - startTimeRef.current
      elapsedMs = Math.floor(elapsedSeconds * 1000)
    }
    
    if (activeShow && elapsedMs >= activeShow.durationMs) {
      stop()
      return
    }

    // Detect backwards jump in time (MTC scrub/rewind)
    if (elapsedMs < lastElapsedMsRef.current - 100) {
      if (activeShow) {
        activeShow.tracks.forEach(track => {
          track.events.forEach(event => {
            if (event.timestampMs >= elapsedMs) {
              firedEventsRef.current.delete(event.id)
            }
          })
        })
      }
    }
    lastElapsedMsRef.current = elapsedMs
    
    setCurrentTimeMs(elapsedMs)

    // Fire-on-Pass Event Engine
    if (activeShow) {
      activeShow.tracks.forEach(track => {
        track.events.forEach(event => {
          // If we just passed the event timestamp and haven't fired it yet
          if (elapsedMs >= event.timestampMs && !firedEventsRef.current.has(event.id)) {
            firedEventsRef.current.add(event.id)
            
            // Execute the action via IPC
            if (event.action === 'recallScene') {
              window.sceneAPI.recallScene(event.payloadId, 0)
            } else if (event.action === 'triggerFx') {
              window.fxAPI.triggerFx(event.payloadId)
            }
          }
        })
      })
    }

    rafRef.current = requestAnimationFrame(loop)
  }, [isPlaying, activeShow])

  useEffect(() => {
    if (isPlaying || syncMode === 'mtc') {
      rafRef.current = requestAnimationFrame(loop)
    } else {
      cancelAnimationFrame(rafRef.current)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, syncMode, loop])

  const play = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    const ctx = audioCtxRef.current
    
    // Resume context if suspended
    if (ctx.state === 'suspended') ctx.resume()

    if (audioBufferRef.current) {
      const source = ctx.createBufferSource()
      source.buffer = audioBufferRef.current
      source.connect(ctx.destination)
      // Start from currentTimeMs (if paused and resumed)
      source.start(0, currentTimeMs / 1000)
      sourceNodeRef.current = source
      
      // We offset the startTime tracking by what we've already played
      startTimeRef.current = ctx.currentTime - (currentTimeMs / 1000)
    } else {
      // Audio-less timeline
      startTimeRef.current = ctx.currentTime - (currentTimeMs / 1000)
    }

    setIsPlaying(true)
  }, [currentTimeMs])

  const pause = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }
    setIsPlaying(false)
  }, [])

  const stop = useCallback(() => {
    pause()
    setCurrentTimeMs(0)
    firedEventsRef.current.clear()
  }, [pause])

  const scrub = useCallback((ms: number) => {
    setCurrentTimeMs(ms)
    // Clear fired events that are strictly AFTER the new scrub time, 
    // so they can fire again.
    if (activeShow) {
      activeShow.tracks.forEach(t => {
        t.events.forEach(e => {
          if (e.timestampMs >= ms) {
            firedEventsRef.current.delete(e.id)
          }
        })
      })
    }
  }, [activeShow])

  // ── Track Management ────────────────────────────────────────────────────────

  const addEvent = useCallback((trackId: string, timestampMs: number, action: 'recallScene' | 'triggerFx', payloadId: string) => {
    if (!activeShow) return
    const newEvent: ShowEvent = { id: crypto.randomUUID(), timestampMs, action, payloadId }
    
    const updatedTracks = activeShow.tracks.map(t => {
      if (t.id === trackId) return { ...t, events: [...t.events, newEvent] }
      return t
    })
    
    setActiveShow({ ...activeShow, tracks: updatedTracks })
  }, [activeShow])

  const removeEvent = useCallback((trackId: string, eventId: string) => {
    if (!activeShow) return
    const updatedTracks = activeShow.tracks.map(t => {
      if (t.id === trackId) return { ...t, events: t.events.filter(e => e.id !== eventId) }
      return t
    })
    setActiveShow({ ...activeShow, tracks: updatedTracks })
  }, [activeShow])

  return {
    shows,
    activeShow,
    setActiveShow,
    createShow,
    saveActiveShow,
    importAudio,
    isPlaying,
    currentTimeMs,
    waveform,
    play,
    pause,
    stop,
    scrub,
    addEvent,
    removeEvent,
    syncMode,
    setSyncMode
  }
}
