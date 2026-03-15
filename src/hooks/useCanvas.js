// src/hooks/useCanvas.js
import { useEffect, useRef } from 'react'
import { drawMetric } from '../utils/draw/drawMetric'
import { drawPixelPattern } from '../utils/draw/drawPixelPattern'

// containerRef: ref to the wrapping div (used for ResizeObserver)
// canvasRef: ref to the <canvas> element
// settings: full mode state including outputWidth / outputHeight
export function useCanvas(containerRef, canvasRef, settings) {
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // Redraw when settings change
  useEffect(() => {
    redraw(canvasRef.current, settings)
  }, [settings])

  // Redraw when the container div resizes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      redraw(canvasRef.current, settingsRef.current)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])
}

function redraw(canvas, settings) {
  if (!canvas || !settings) return
  const { outputWidth, outputHeight } = settings
  if (!outputWidth || !outputHeight || outputWidth <= 0 || outputHeight <= 0) return

  canvas.width = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext('2d')

  if (settings.mode === 'metric') {
    drawMetric(ctx, settings)
  } else if (settings.mode === 'pixel') {
    drawPixelPattern(ctx, settings)
  }
}
