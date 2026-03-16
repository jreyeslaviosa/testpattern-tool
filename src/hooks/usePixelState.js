// src/hooks/usePixelState.js
import { useState, useMemo } from 'react'
import { calcGridTotal, calcGridPositions } from '../utils/calculations'

const DEFAULTS = {
  mode: 'pixel',
  grid: {
    rows: 1,
    cols: 2,
    width: 1920,
    height: 1080,
    blendH: 0,
    blendV: 0,
  },
  display: {
    colorBars: false,
    showBlendZones: true,
    gridSize: 100,
    textSize: 14,
    patternType: 'grid',
    showCircles: true,
    title: '',
    circleStroke: 2,
    lineStroke: 1,
  },
  colors: {
    background: '#000000',
    pattern: '#ffffff',
    text: '#ffffff',
    blendZone: '#6366f1',
  },
}

export function usePixelState(initialPreset) {
  const [state, setState] = useState(() =>
    initialPreset ? { ...DEFAULTS, ...initialPreset } : DEFAULTS
  )

  const settings = useMemo(() => {
    const { totalWidth, totalHeight } = calcGridTotal(state.grid)
    const positions = calcGridPositions(state.grid)
    return {
      ...state,
      outputWidth: totalWidth,
      outputHeight: totalHeight,
      positions,
    }
  }, [state])

  function setGrid(key, value) {
    setState(s => ({ ...s, grid: { ...s.grid, [key]: value } }))
  }

  function setDisplay(key, value) {
    setState(s => ({ ...s, display: { ...s.display, [key]: value } }))
  }

  function setColor(key, value) {
    setState(s => ({ ...s, colors: { ...s.colors, [key]: value } }))
  }

  function applyPreset(preset) {
    setState({ ...DEFAULTS, ...preset })
  }

  return { state, settings, setGrid, setDisplay, setColor, applyPreset }
}
