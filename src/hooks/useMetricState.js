// src/hooks/useMetricState.js
import { useState, useMemo } from 'react'

const DEFAULTS = {
  mode: 'metric',
  wall: { width: 8.0, height: 4.5 },
  resolution: 3780,  // px/m  (~96 DPI)
  lock: {
    width: false,
    height: false,
    aspectRatio: false,
    pixelWidth: null,
    pixelHeight: null,
    arRatio: null,
  },
  gridSubdivision: 1.0,
  patternType: 'grid',
  lineStroke: 1,
  title: '',
  colors: { background: '#ffffff', pattern: '#374151', text: '#374151', border: '#111111' },
}

export function useMetricState(initialPreset) {
  const [state, setState] = useState(() => initialPreset ? { ...DEFAULTS, ...initialPreset } : DEFAULTS)

  const settings = useMemo(() => {
    const rawW = Math.floor(state.wall.width * state.resolution)
    const rawH = Math.floor(state.wall.height * state.resolution)
    const outputWidth  = state.lock.width  && state.lock.pixelWidth  ? state.lock.pixelWidth  : rawW
    const outputHeight = state.lock.height && state.lock.pixelHeight ? state.lock.pixelHeight : rawH
    const gridInterval = Math.floor(state.gridSubdivision * state.resolution)
    return { ...state, outputWidth, outputHeight, gridInterval }
  }, [state])

  function setWall(key, value) {
    setState(s => {
      if (s.lock.aspectRatio && s.lock.arRatio) {
        if (key === 'width') {
          return { ...s, wall: { width: value, height: +((value / s.lock.arRatio).toFixed(4)) } }
        } else {
          return { ...s, wall: { width: +((value * s.lock.arRatio).toFixed(4)), height: value } }
        }
      }
      return { ...s, wall: { ...s.wall, [key]: value } }
    })
  }

  function setResolution(value) {
    setState(s => ({ ...s, resolution: value }))
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
    if (key === 'aspectRatio') {
      setState(s => {
        if (!s.lock.aspectRatio) {
          const arRatio = s.wall.height > 0 ? s.wall.width / s.wall.height : 1
          return { ...s, lock: { ...s.lock, aspectRatio: true, arRatio } }
        }
        return { ...s, lock: { ...s.lock, aspectRatio: false, arRatio: null } }
      })
      return
    }
    setState(s => {
      const pixelKey = `pixel${key.charAt(0).toUpperCase() + key.slice(1)}`
      if (!s.lock[key]) {
        const dim = key === 'width' ? s.wall.width : s.wall.height
        if (!dim || dim <= 0) return s
        const currentPixels = Math.floor(dim * s.resolution)
        return { ...s, lock: { ...s.lock, [key]: true, [pixelKey]: currentPixels } }
      } else {
        return { ...s, lock: { ...s.lock, [key]: false, [pixelKey]: null } }
      }
    })
  }

  function setLockPixels(key, value) {
    setState(s => {
      const ar = s.wall.height > 0 ? s.wall.width / s.wall.height : 1
      const pixelWidth = key === 'width' ? value : Math.round(value * ar)
      const pixelHeight = key === 'height' ? value : Math.round(value / ar)
      return { ...s, lock: { ...s.lock, pixelWidth, pixelHeight } }
    })
  }

  function setField(key, value) {
    setState(s => ({ ...s, [key]: value }))
  }

  function applyPreset(preset) {
    setState({ ...DEFAULTS, ...preset })
  }

  return { state, settings, setWall, setResolution, setGridSubdivision, setPatternType, setColor, toggleLock, setLockPixels, setField, applyPreset }
}
