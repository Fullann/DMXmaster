import { useState, useRef, useCallback } from 'react'

interface XYPadProps {
  x: number
  y: number
  onChange: (x: number, y: number) => void
}

export function XYPad({ x, y, onChange }: XYPadProps) {
  const padRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!padRef.current) return
    const rect = padRef.current.getBoundingClientRect()
    let newX = (clientX - rect.left) / rect.width
    let newY = (clientY - rect.top) / rect.height
    
    // Clamp to 0..1
    newX = Math.max(0, Math.min(1, newX))
    newY = Math.max(0, Math.min(1, newY))
    
    onChange(Math.round(newX * 255), Math.round(newY * 255))
  }, [onChange])

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    padRef.current?.setPointerCapture(e.pointerId)
    handleMove(e.clientX, e.clientY)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    handleMove(e.clientX, e.clientY)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    padRef.current?.releasePointerCapture(e.pointerId)
  }

  return (
    <div 
      className="xy-pad-container"
      ref={padRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: 'none' }}
    >
      <div className="xy-pad-grid">
        <div className="xy-pad-axis-x" />
        <div className="xy-pad-axis-y" />
      </div>
      <div 
        className="xy-pad-thumb" 
        style={{ 
          left: `${(x / 255) * 100}%`, 
          top: `${(y / 255) * 100}%` 
        }} 
      />
    </div>
  )
}
