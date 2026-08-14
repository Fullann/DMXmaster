import { useState, useCallback, useEffect, useRef } from 'react'
import type { PixelConfig, MatrixFixture } from '@/types/pixel'

export function usePixelMapper() {
  const [config, setConfig] = useState<PixelConfig>({ matrices: [] })
  
  // Media State
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'video' | 'image' | 'generator' | null>(null)
  const [activeGenerator, setActiveGenerator] = useState<'Rainbow' | 'Plasma' | 'Strobe' | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  
  // Preview Canvas reference (to display generator in the UI)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  
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
    setActiveGenerator(null)
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

  const setGenerator = useCallback((type: 'Rainbow' | 'Plasma' | 'Strobe') => {
    setMediaType('generator')
    setActiveGenerator(type)
    setMediaUrl(null)
    setIsPlaying(true)
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
    
    if (!source && mediaType !== 'generator') return

    // Update preview canvas if generator is active
    if (mediaType === 'generator' && previewCanvasRef.current) {
      const previewCtx = previewCanvasRef.current.getContext('2d')
      if (previewCtx) {
        renderGenerator(previewCtx, previewCanvasRef.current.width, previewCanvasRef.current.height, now, activeGenerator)
      }
    }

    // For every active matrix, we scale the media down, read the pixels, and send.
    for (const matrix of config.matrices) {
      // Resize canvas to match the physical matrix exact dimensions
      if (canvas.width !== matrix.width) canvas.width = matrix.width
      if (canvas.height !== matrix.height) canvas.height = matrix.height

      if (mediaType === 'generator') {
        // Draw mathematically onto the exact matrix size
        renderGenerator(ctx, matrix.width, matrix.height, now, activeGenerator)
      } else if (source) {
        // Draw and scale media
        ctx.drawImage(source, 0, 0, matrix.width, matrix.height)
      }
      
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
  }, [isPlaying, mediaType, config.matrices, activeGenerator])

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
    activeGenerator,
    setGenerator,
    isPlaying,
    togglePlay,
    videoRef,
    previewCanvasRef
  }
}

// ── Generator Rendering Logic ─────────────────────────────────────────────────
function renderGenerator(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, type: string | null) {
  if (!width || !height) return
  const imgData = ctx.createImageData(width, height)
  const data = imgData.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      let r = 0, g = 0, b = 0

      if (type === 'Rainbow') {
        const hue = (x / width + y / height + time / 2000) % 1
        const rgb = hslToRgb(hue, 1, 0.5)
        r = rgb[0]; g = rgb[1]; b = rgb[2]
      } 
      else if (type === 'Plasma') {
        const v = Math.sin(x / 5 + time / 1000) + 
                  Math.sin(y / 5 + time / 1000) + 
                  Math.sin((x + y) / 5 + time / 1000)
        const hue = (v + 3) / 6 // Normalize to 0-1
        const rgb = hslToRgb((hue + time/5000) % 1, 1, 0.5)
        r = rgb[0]; g = rgb[1]; b = rgb[2]
      }
      else if (type === 'Strobe') {
        const isFlash = (time % 500) < 50 // 50ms flash every 500ms
        const val = isFlash ? 255 : 0
        r = val; g = val; b = val
      }

      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = 255 // Alpha
    }
  }
  ctx.putImageData(imgData, 0, 0)
}

function hslToRgb(h: number, s: number, l: number) {
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}
