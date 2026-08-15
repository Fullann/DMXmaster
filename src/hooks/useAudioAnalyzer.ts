import { useState, useCallback, useEffect, useRef } from 'react'

export interface AudioDevice {
  deviceId: string
  label: string
}

export interface AudioBands {
  lows: number   // 0-255
  mids: number   // 0-255
  highs: number  // 0-255
}

export function useAudioAnalyzer() {
  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default')
  const [isListening, setIsListening] = useState(false)
  
  // Real-time local state for UI (60fps)
  const [bands, setBands] = useState<AudioBands>({ lows: 0, mids: 0, highs: 0 })
  
  const [isBeat, setIsBeat] = useState(false)
  const [autoBpmEnabled, setAutoBpmEnabled] = useState(false)
  const [beatThreshold, setBeatThreshold] = useState(180)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  
  const animationFrameRef = useRef<number>(0)
  const lastIpcSendMs = useRef<number>(0)
  const lastBeatTimeRef = useRef<number>(0)
  const beatTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync state to static properties for the requestAnimationFrame closure
  useEffect(() => {
    useAudioAnalyzer.globalAutoBpmEnabled = autoBpmEnabled
    useAudioAnalyzer.globalBeatThreshold = beatThreshold
  }, [autoBpmEnabled, beatThreshold])

  // ── Device Enumeration ──────────────────────────────────────────────────────

  const enumerateDevices = useCallback(async () => {
    try {
      // Must prompt for permission once before labels are visible
      await navigator.mediaDevices.getUserMedia({ audio: true })
      const devs = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devs.filter(d => d.kind === 'audioinput')
      setDevices(audioInputs.map(d => ({ deviceId: d.deviceId, label: d.label || 'Unknown Mic' })))
      if (audioInputs.length > 0 && selectedDeviceId === 'default') {
        setSelectedDeviceId(audioInputs[0].deviceId)
      }
    } catch (err) {
      console.error('[Audio] Failed to enumerate devices:', err)
    }
  }, [selectedDeviceId])

  useEffect(() => {
    enumerateDevices()
  }, [enumerateDevices])

  // ── Audio Engine Loop ───────────────────────────────────────────────────────

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return
    const analyser = analyserRef.current

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteFrequencyData(dataArray)

    // Calculate energy per band
    // FFT Size 2048 -> 1024 bins. Sample rate usually 44100Hz or 48000Hz.
    // Bin width = ~21.5 Hz
    
    // Lows: roughly bins 1 to 12 (20Hz - 250Hz)
    // Mids: roughly bins 12 to 186 (250Hz - 4000Hz)
    // Highs: roughly bins 186 to 930 (4000Hz - 20000Hz)

    let lowSum = 0; let midSum = 0; let highSum = 0
    let lowCount = 0; let midCount = 0; let highCount = 0

    for (let i = 1; i < bufferLength; i++) {
      const val = dataArray[i]
      if (i < 12) {
        lowSum += val; lowCount++
      } else if (i < 186) {
        midSum += val; midCount++
      } else if (i < 930) {
        highSum += val; highCount++
      }
    }

    const currentBands = {
      lows: Math.round(lowSum / (lowCount || 1)),
      mids: Math.round(midSum / (midCount || 1)),
      highs: Math.round(highSum / (highCount || 1))
    }

    // Update local React state for smooth 60fps UI
    setBands(currentBands)

    // ── Beat Detection (Auto-BPM) ─────────────────────────────────────────────
    const now = performance.now()
    if (useAudioAnalyzer.globalAutoBpmEnabled) { // Static access so we don't need to depend on the closure changing
      if (currentBands.lows > useAudioAnalyzer.globalBeatThreshold) {
        if (now - lastBeatTimeRef.current > 300) { // Debounce: 300ms minimum between beats (~200 BPM max)
          lastBeatTimeRef.current = now
          window.audioAPI.emitBeat()
          setIsBeat(true)
          if (beatTimeoutRef.current) clearTimeout(beatTimeoutRef.current)
          beatTimeoutRef.current = setTimeout(() => setIsBeat(false), 150)
        }
      }
    }

    // Throttle IPC send to ~30Hz (every 33ms) to avoid bottlenecking Electron bridge
    if (now - lastIpcSendMs.current >= 33) {
      window.audioAPI.updateBands(currentBands.lows, currentBands.mids, currentBands.highs)
      lastIpcSendMs.current = now
    }

    animationFrameRef.current = requestAnimationFrame(analyzeAudio)
  }, [])

  // ── Start / Stop ────────────────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined }
      })
      streamRef.current = stream

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioCtx

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8 // Adds inherent smoothing to the FFT data
      analyserRef.current = analyser

      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)
      sourceRef.current = source

      setIsListening(true)
      analyzeAudio()
    } catch (err) {
      console.error('[Audio] Failed to start listening:', err)
      setIsListening(false)
    }
  }, [selectedDeviceId, analyzeAudio])

  const stopListening = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    if (sourceRef.current) sourceRef.current.disconnect()
    if (audioContextRef.current) audioContextRef.current.close()
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    
    setIsListening(false)
    setBands({ lows: 0, mids: 0, highs: 0 })
    window.audioAPI.updateBands(0, 0, 0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [stopListening])

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isListening,
    startListening,
    stopListening,
    bands,
    isBeat,
    autoBpmEnabled,
    setAutoBpmEnabled,
    beatThreshold,
    setBeatThreshold
  }
}

useAudioAnalyzer.globalAutoBpmEnabled = false
useAudioAnalyzer.globalBeatThreshold = 180
