// src/hooks/usePixelState.js
import { useState, useMemo } from 'react'
import { calcPixelTotal, calcProjectorPositions } from '../utils/calculations'

const DEFAULT_PROJECTOR = {
  label: 'Projector 1',
  width: 1920,
  height: 1080,
  blend: { left: 0, right: 0, top: 0, bottom: 0 },
}

const DEFAULTS = {
  mode: 'pixel',
  projectors: [{ ...DEFAULT_PROJECTOR }],
  display: {
    layoutDirection: 'horizontal',
    colorBars: false,
    showBlendZones: true,
    gridSize: 100,
    patternType: 'grid',
  },
  colors: {
    background: '#ffffff',
    pattern: '#374151',
    text: '#374151',
    blendZone: '#6366f1',
  },
}

export function usePixelState(initialPreset) {
  const [state, setState] = useState(() => initialPreset ? { ...DEFAULTS, ...initialPreset } : DEFAULTS)

  const settings = useMemo(() => {
    const { totalWidth, totalHeight } = calcPixelTotal(state.projectors, state.display.layoutDirection)
    const positions = calcProjectorPositions(state.projectors, state.display.layoutDirection)
    return {
      ...state,
      outputWidth: totalWidth,
      outputHeight: totalHeight,
      positions,
    }
  }, [state])

  function addProjector() {
    setState(s => ({
      ...s,
      projectors: [
        ...s.projectors,
        { ...DEFAULT_PROJECTOR, label: `Projector ${s.projectors.length + 1}` },
      ],
    }))
  }

  function removeProjector(index) {
    setState(s => {
      if (s.projectors.length <= 1) return s
      return { ...s, projectors: s.projectors.filter((_, i) => i !== index) }
    })
  }

  function updateProjector(index, key, value) {
    setState(s => ({
      ...s,
      projectors: s.projectors.map((p, i) => i === index ? { ...p, [key]: value } : p),
    }))
  }

  function updateProjectorBlend(index, edge, value) {
    setState(s => ({
      ...s,
      projectors: s.projectors.map((p, i) =>
        i === index ? { ...p, blend: { ...p.blend, [edge]: value } } : p
      ),
    }))
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

  return {
    state, settings,
    addProjector, removeProjector, updateProjector, updateProjectorBlend,
    setDisplay, setColor, applyPreset,
  }
}
