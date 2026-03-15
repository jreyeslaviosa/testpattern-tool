// src/components/CanvasPreview.jsx
import { useRef, useEffect } from 'react'
import { useCanvas } from '../hooks/useCanvas'

export default function CanvasPreview({ settings }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  // Pass containerRef so ResizeObserver watches the correct container element
  useCanvas(containerRef, canvasRef, settings)

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'hidden',
        background: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          display: 'block',
        }}
      />
    </div>
  )
}
