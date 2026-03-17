// src/components/CanvasPreview.jsx
import { useRef, useState, useCallback, useEffect } from 'react'
import { useCanvas } from '../hooks/useCanvas'

export default function CanvasPreview({ settings }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null) // { startX, startY, startPanX, startPanY }

  useCanvas(containerRef, canvasRef, settings)

  // Reset zoom/pan when output dimensions change
  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [settings.outputWidth, settings.outputHeight])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const rect = containerRef.current.getBoundingClientRect()
    // cursor offset from container center
    const cx = e.clientX - rect.left - rect.width / 2
    const cy = e.clientY - rect.top - rect.height / 2
    setZoom(z => {
      const newZoom = Math.min(20, Math.max(0.05, z * factor))
      // keep cursor point fixed: adjust pan proportionally
      setPan(p => ({
        x: cx - (cx - p.x) * (newZoom / z),
        y: cy - (cy - p.y) * (newZoom / z),
      }))
      return newZoom
    })
  }, [])

  // Attach wheel with { passive: false } so we can preventDefault
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  function handleMouseDown(e) {
    if (e.button !== 0) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y }
  }

  function handleMouseMove(e) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPan({ x: dragRef.current.startPanX + dx, y: dragRef.current.startPanY + dy })
  }

  function handleMouseUp() {
    dragRef.current = null
  }

  function handleDoubleClick() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const isDragging = !!dragRef.current

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      style={{
        flex: 1,
        overflow: 'hidden',
        background: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          aspectRatio: settings.outputWidth && settings.outputHeight
            ? `${settings.outputWidth} / ${settings.outputHeight}`
            : undefined,
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          display: 'block',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.05s ease-out',
        }}
      />
      {/* Zoom indicator — shown when not at 1x */}
      {Math.abs(zoom - 1) > 0.01 && (
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(0,0,0,0.5)', color: '#fff',
          fontSize: 11, padding: '2px 7px', borderRadius: 3,
          pointerEvents: 'none',
        }}>
          {Math.round(zoom * 100)}% · dbl-click to reset
        </div>
      )}
    </div>
  )
}
