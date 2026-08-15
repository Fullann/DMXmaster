import React, { useRef, useEffect, useState, useCallback } from 'react'
import { hsvToRgb } from '@/utils/gelLibrary'

interface ColorWheelProps {
  onColorChange: (r: number, g: number, b: number) => void
  size?: number
}

export function ColorWheel({ onColorChange, size = 200 }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hsv, setHsv] = useState({ h: 0, s: 0, v: 1 })
  const [isDragging, setIsDragging] = useState(false)

  // ── Draw Wheel ─────────────────────────────────────────────────────────────
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(centerX, centerY) - 10

    ctx.clearRect(0, 0, width, height)

    // Draw HSV circle
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 2) * (Math.PI / 180)
      const endAngle = (angle + 2) * (Math.PI / 180)
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
      
      const { r: r0, g: g0, b: b0 } = hsvToRgb(angle / 360, 0, hsv.v)
      const { r: r1, g: g1, b: b1 } = hsvToRgb(angle / 360, 1, hsv.v)
      
      gradient.addColorStop(0, `rgb(${r0},${g0},${b0})`)
      gradient.addColorStop(1, `rgb(${r1},${g1},${b1})`)
      
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()
    }

    // Draw cursor
    const angleRad = hsv.h * 2 * Math.PI
    const distance = hsv.s * radius
    const cursorX = centerX + Math.cos(angleRad) * distance
    const cursorY = centerY + Math.sin(angleRad) * distance

    ctx.beginPath()
    ctx.arc(cursorX, cursorY, 6, 0, 2 * Math.PI)
    ctx.strokeStyle = hsv.v < 0.5 ? '#fff' : '#000'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fill()
  }, [hsv])

  useEffect(() => {
    drawWheel()
  }, [drawWheel])

  // ── Interaction ────────────────────────────────────────────────────────────
  const handleInteraction = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    let clientX, clientY

    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }

    const x = clientX - rect.left
    const y = clientY - rect.top

    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const radius = Math.min(centerX, centerY) - 10

    const dx = x - centerX
    const dy = y - centerY

    let angle = Math.atan2(dy, dx)
    if (angle < 0) angle += 2 * Math.PI

    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), radius)

    const h = angle / (2 * Math.PI)
    const s = distance / radius

    setHsv(prev => {
      const next = { ...prev, h, s }
      const rgb = hsvToRgb(next.h, next.s, next.v)
      onColorChange(rgb.r, rgb.g, rgb.b)
      return next
    })
  }, [onColorChange])

  // Global mouse handlers for drag
  useEffect(() => {
    if (!isDragging) return
    
    const onMouseMove = (e: MouseEvent) => handleInteraction(e)
    const onMouseUp = () => setIsDragging(false)
    const onTouchMove = (e: TouchEvent) => handleInteraction(e)
    const onTouchEnd = () => setIsDragging(false)
    
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [isDragging, handleInteraction])

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setHsv(prev => {
      const next = { ...prev, v }
      const rgb = hsvToRgb(next.h, next.s, next.v)
      onColorChange(rgb.r, rgb.g, rgb.b)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ cursor: 'crosshair', borderRadius: '50%' }}
        onMouseDown={(e) => {
          setIsDragging(true)
          handleInteraction(e)
        }}
        onTouchStart={(e) => {
          setIsDragging(true)
          handleInteraction(e)
        }}
      />
      
      <div style={{ width: '100%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>Brightness</span>
          <span>{Math.round(hsv.v * 100)}%</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={hsv.v} 
          onChange={handleValueChange}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>
    </div>
  )
}
