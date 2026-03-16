// src/hooks/useMetricState.js
import { useState, useMemo } from 'react'
import { metersToPixels } from '../utils/calculations'

const DEFAULTS = {
  mode: 'metric',
  wall: { width: 8.0, height: 4.5 },
  dpi: 96,
  lock: { width: false, height: false, pixelWidth: null, pixelHeight: null },
  gridSubdivision: 1.0,
  patternType: 'grid',
  colors: { background: '#ffffff', pattern: '#374151', text: '#374151', border: '#111111' },
}

export function useMetricState(initialPreset) {
  const [state, setState] = useState(() => initialPreset ? { ...DEFAULTS, ...initialPreset } : DEFAULTS)

  const settings = useMemo(() => {
    const rawW = metersToPixels(state.wall.width, state.dpi)
    const rawH = metersToPixels(state.wall.height, state.dpi)
    const outputWidth  = state.lock.width  && state.lock.pixelWidth  ? state.lock.pixelWidth  : rawW
    const outputHeight = state.lock.height && state.lock.pixelHeight ? state.lock.pixelHeight : rawH
    const gridInterval = metersToPixels(state.gridSubdivision, state.dpi)
    return { ...state, outputWidth, outputHeight, gridInterval }
  }, [state])

  function setWall(key, value) {
    setState(s => ({ ...s, wall: { ...s.wall, [key]: value } }))
  }

  function setDpi(value) {
    setState(s => ({ ...s, dpi: value }))
  }

  function setGridSubdivision(value) {
    setState(s => ({ ...s, gridSubdivision: value }))
  }

  function setPatternType(value) {
    setState(s => ({ ...s, patternType: value }))
  }

  function setColor(key, value) {
    setState(s => ({ ...s, colors: { ...s.colors, [key]: value } }))
  }

  function toggleLock(key) {
    setState(s => {
      const currentPixels = key === 'width'
        ? metersToPixels(s.wall.width, s.dpi)
        : metersToPixels(s.wall.height, s.dpi)
      if (!s.lock[key]) {
        // Engaging lock — validate first
        const dim = key === 'width' ? s.wall.width : s.wall.height
        if (!dim || dim <= 0) return s // don't engage
        return {
          ...s,
          lock: { ...s.lock, [key]: true, [`pixel${key.charAt(0).toUpperCase() + key.slice(1)}`]: currentPixels },
        }
      } else {
        // Releasing lock
        return {
          ...s,
          lock: { ...s.lock, [key]: false, [`pixel${key.charAt(0).toUpperCase() + key.slice(1)}`]: null },
        }
      }
    })
  }

  function applyPreset(preset) {
    setState({ ...DEFAULTS, ...preset })
  }

  return { state, settings, setWall, setDpi, setGridSubdivision, setPatternType, setColor, toggleLock, applyPreset }
}
