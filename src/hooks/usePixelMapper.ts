import { useState, useCallback, useEffect, useRef } from 'react'
import type { PixelConfig, MatrixFixture } from '@/types/pixel'

export function usePixelMapper() {
  const [config, setConfig] = useState<PixelConfig>({ matrices: [] })
  
  // Media State
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'video' | 'image' | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  
  // Internal sampling context
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  
  const rafRef = useRef<number>(0)
  const lastIpcTimeRef = useRef<number>(0)

  // ── Config Management ───────────────────────────────────────────────────────
  
  const loadConfig = useCallback(async () => {
    const res = await window.pixelAPI.getConfig()
    if (res.success && res.config) setConfig(res.config)
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const saveConfig = useCallback(async (newCfg: PixelConfig) => {
    setConfig(newCfg)
    await window.pixelAPI.saveConfig(newCfg)
  }, [])

  const addMatrix = useCallback((m: Omit<MatrixFixture, 'id'>) => {
    const newCfg = { ...config, matrices: [...config.matrices, { ...m, id: crypto.randomUUID() }] }
    saveConfig(newCfg)
  }, [config, saveConfig])

  const removeMatrix = useCallback((id: string) => {
    const newCfg = { ...config, matrices: config.matrices.filter(m => m.id !== id) }
    saveConfig(newCfg)
  }, [config, saveConfig])

  // ── Media Engine ────────────────────────────────────────────────────────────
  
  useEffect(() => {
    // Initialize offscreen canvas once
    const canvas = document.createElement('canvas')
    offscreenCanvasRef.current = canvas
    offscreenCtxRef.current = canvas.getContext('2d', { willReadFrequently: true })
  }, [])

  const loadMedia = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    setMediaUrl(url)
    if (file.type.startsWith('video/')) {
      setMediaType('video')
      setIsPlaying(true)
    } else if (file.type.startsWith('image/')) {
      setMediaType('image')
      setIsPlaying(true)
      
      const img = new Image()
      img.src = url
      imageRef.current = img
    }
  }, [])

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }, [isPlaying])

  // ── The Sampler Loop ────────────────────────────────────────────────────────

  const loop = useCallback(() => {
    rafRef.current = requestAnimationFrame(loop)
    
    if (!isPlaying) return
    const now = performance.now()
    if (now - lastIpcTimeRef.current < 33) return // Throttle to ~30Hz (33ms)

    const ctx = offscreenCtxRef.current
    const canvas = offscreenCanvasRef.current
    if (!ctx || !canvas) return

    // Which source are we drawing?
    let source: HTMLVideoElement | HTMLImageElement | null = null
    if (mediaType === 'video' && videoRef.current && videoRef.current.readyState >= 2) {
      source = videoRef.current
    } else if (mediaType === 'image' && imageRef.current && imageRef.current.complete) {
      source = imageRef.current
    }
    
    if (!source) return

    // For every active matrix, we scale the media down, read the pixels, and send.
    for (const matrix of config.matrices) {
      // Resize canvas to match the physical matrix exact dimensions
      if (canvas.width !== matrix.width) canvas.width = matrix.width
      if (canvas.height !== matrix.height) canvas.height = matrix.height

      // Draw and scale media
      ctx.drawImage(source, 0, 0, matrix.width, matrix.height)
      
      // Extract pixels (RGBA)
      const imgData = ctx.getImageData(0, 0, matrix.width, matrix.height).data
      
      // Strip Alpha channel to create a compact RGB Uint8Array
      const rgbBuffer = new Uint8Array(matrix.width * matrix.height * 3)
      for (let i = 0, j = 0; i < imgData.length; i += 4, j += 3) {
        rgbBuffer[j]     = imgData[i]     // R
        rgbBuffer[j + 1] = imgData[i + 1] // G
        rgbBuffer[j + 2] = imgData[i + 2] // B
      }

      // Fire and forget over IPC
      window.pixelAPI.updateFrame(matrix.id, rgbBuffer)
    }

    lastIpcTimeRef.current = now
  }, [isPlaying, mediaType, config.matrices])

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(loop)
    } else {
      cancelAnimationFrame(rafRef.current)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, loop])

  return {
    config,
    addMatrix,
    removeMatrix,
    mediaUrl,
    mediaType,
    loadMedia,
    isPlaying,
    togglePlay,
    videoRef
  }
}
