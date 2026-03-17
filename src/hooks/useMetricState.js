// src/hooks/useMetricState.js
import { useState, useMemo } from 'react'

const DEFAULTS = {
  mode: 'metric',
  wall: { width: 8.0, height: 4.5 },
  resolution: 200,   // px/m  (e.g. 1920px ÷ 9.6m ≈ 200)
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
    const ar = state.wall.height > 0 ? state.wall.width / state.wall.height : 1

    let outputWidth, outputHeight
    if (state.lock.width && state.lock.pixelWidth && state.lock.height && state.lock.pixelHeight) {
      outputWidth = state.lock.pixelWidth
      outputHeight = state.lock.pixelHeight
    } else if (state.lock.width && state.lock.pixelWidth) {
      outputWidth = state.lock.pixelWidth
      outputHeight = Math.round(state.lock.pixelWidth / ar)
    } else if (state.lock.height && state.lock.pixelHeight) {
      outputHeight = state.lock.pixelHeight
      outputWidth = Math.round(state.lock.pixelHeight * ar)
    } else {
      outputWidth = rawW
      outputHeight = rawH
    }

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
    const pixelKey = `pixel${key.charAt(0).toUpperCase() + key.slice(1)}`
    setState(s => ({ ...s, lock: { ...s.lock, [pixelKey]: value } }))
  }

  function setField(key, value) {
    setState(s => ({ ...s, [key]: value }))
  }

  function applyPreset(preset) {
    setState({ ...DEFAULTS, ...preset })
  }

  return { state, settings, setWall, setResolution, setGridSubdivision, setPatternType, setColor, toggleLock, setLockPixels, setField, applyPreset }
}
