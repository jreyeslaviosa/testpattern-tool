// tests/hooks/usePixelState.test.js
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePixelState } from '../../src/hooks/usePixelState'

describe('usePixelState', () => {
  it('initializes with default grid (1 row, 2 cols, 1920×1080)', () => {
    const { result } = renderHook(() => usePixelState(null))
    expect(result.current.state.grid.rows).toBe(1)
    expect(result.current.state.grid.cols).toBe(2)
    expect(result.current.state.grid.width).toBe(1920)
    expect(result.current.state.grid.height).toBe(1080)
  })

  it('derives outputWidth and outputHeight from grid', () => {
    const { result } = renderHook(() => usePixelState(null))
    // 2 cols * 1920 - 1*0 = 3840
    expect(result.current.settings.outputWidth).toBe(3840)
    expect(result.current.settings.outputHeight).toBe(1080)
  })

  it('setGrid updates a grid field and recalculates outputWidth', () => {
    const { result } = renderHook(() => usePixelState(null))
    act(() => result.current.setGrid('cols', 3))
    expect(result.current.state.grid.cols).toBe(3)
    expect(result.current.settings.outputWidth).toBe(5760) // 3*1920
  })

  it('setGrid blendH recalculates positions', () => {
    const { result } = renderHook(() => usePixelState(null))
    act(() => result.current.setGrid('blendH', 40))
    expect(result.current.settings.positions[1].x).toBe(1880)
  })

  it('positions contain col and row fields', () => {
    const { result } = renderHook(() => usePixelState(null))
    expect(result.current.settings.positions[0]).toMatchObject({ col: 0, row: 0 })
    expect(result.current.settings.positions[1]).toMatchObject({ col: 1, row: 0 })
  })

  it('setDisplay updates a display field', () => {
    const { result } = renderHook(() => usePixelState(null))
    act(() => result.current.setDisplay('patternType', 'dots'))
    expect(result.current.state.display.patternType).toBe('dots')
  })

  it('setColor updates a color field', () => {
    const { result } = renderHook(() => usePixelState(null))
    act(() => result.current.setColor('background', '#ff0000'))
    expect(result.current.state.colors.background).toBe('#ff0000')
  })

  it('applyPreset replaces state with preset merged into defaults', () => {
    const { result } = renderHook(() => usePixelState(null))
    const preset = {
      mode: 'pixel',
      grid: { rows: 2, cols: 3, width: 1920, height: 1080, blendH: 0, blendV: 0 },
      display: {
        colorBars: false, showBlendZones: true, gridSize: 100, textSize: 14,
        patternType: 'reference', showCircles: true, title: 'Test',
      },
      colors: { background: '#000', pattern: '#fff', text: '#fff', blendZone: '#6366f1' },
    }
    act(() => result.current.applyPreset(preset))
    expect(result.current.state.grid.rows).toBe(2)
    expect(result.current.state.grid.cols).toBe(3)
    expect(result.current.state.display.patternType).toBe('reference')
  })

  it('initializes from initialPreset', () => {
    const preset = {
      mode: 'pixel',
      grid: { rows: 1, cols: 1, width: 3840, height: 2160, blendH: 0, blendV: 0 },
      display: {
        colorBars: false, showBlendZones: true, gridSize: 200, textSize: 18,
        patternType: 'grid', showCircles: true, title: '',
      },
      colors: { background: '#000', pattern: '#fff', text: '#fff', blendZone: '#6366f1' },
    }
    const { result } = renderHook(() => usePixelState(preset))
    expect(result.current.state.grid.width).toBe(3840)
    expect(result.current.settings.outputWidth).toBe(3840)
  })
})
