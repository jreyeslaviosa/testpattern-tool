// tests/hooks/useMetricState.test.js
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMetricState } from '../../src/hooks/useMetricState'

describe('useMetricState', () => {
  it('initializes with defaults', () => {
    const { result } = renderHook(() => useMetricState(null))
    expect(result.current.state.wall.width).toBe(8.0)
    expect(result.current.state.dpi).toBe(96)
    expect(result.current.state.lock.width).toBe(false)
  })

  it('calculates outputWidth and outputHeight from meters+DPI', () => {
    const { result } = renderHook(() => useMetricState(null))
    // 8m at 96dpi = Math.floor(8 / 0.0254 * 96) = 30236
    expect(result.current.settings.outputWidth).toBe(30236)
  })

  it('updates wall width', () => {
    const { result } = renderHook(() => useMetricState(null))
    act(() => result.current.setWall('width', 4.0))
    expect(result.current.state.wall.width).toBe(4.0)
  })

  it('lock prevents recalculation', () => {
    const { result } = renderHook(() => useMetricState(null))
    // Lock width at current value
    const lockedW = result.current.settings.outputWidth
    act(() => result.current.toggleLock('width'))
    act(() => result.current.setWall('width', 4.0))
    expect(result.current.settings.outputWidth).toBe(lockedW)
  })

  it('lock does not engage when width is invalid', () => {
    const { result } = renderHook(() => useMetricState(null))
    act(() => result.current.setWall('width', -1))
    act(() => result.current.toggleLock('width'))
    expect(result.current.state.lock.width).toBe(false)
  })

  it('releasing lock resumes live recalculation', () => {
    const { result } = renderHook(() => useMetricState(null))
    act(() => result.current.toggleLock('width'))
    act(() => result.current.toggleLock('width')) // release
    expect(result.current.state.lock.width).toBe(false)
    expect(result.current.state.lock.pixelWidth).toBeNull()
    act(() => result.current.setWall('width', 4.0))
    expect(result.current.settings.outputWidth).toBe(result.current.settings.outputWidth) // recalculates
    // After release + change, outputWidth should track new wall width
    const expected = Math.floor((4.0 / 0.0254) * 96)
    expect(result.current.settings.outputWidth).toBe(expected)
  })

  it('initializes from preset', () => {
    const preset = {
      mode: 'metric', wall: { width: 5, height: 3 }, dpi: 72,
      lock: { width: false, height: false, pixelWidth: null, pixelHeight: null },
      gridSubdivision: 0.5, patternType: 'dots',
      colors: { background: '#000', pattern: '#fff', text: '#fff', border: '#fff' },
    }
    const { result } = renderHook(() => useMetricState(preset))
    expect(result.current.state.wall.width).toBe(5)
    expect(result.current.state.dpi).toBe(72)
  })
})
