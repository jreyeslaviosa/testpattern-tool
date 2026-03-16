// tests/hooks/useMetricState.test.js
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMetricState } from '../../src/hooks/useMetricState'

describe('useMetricState', () => {
  it('initializes with defaults', () => {
    const { result } = renderHook(() => useMetricState(null))
    expect(result.current.state.wall.width).toBe(8.0)
    expect(result.current.state.resolution).toBe(3780)
    expect(result.current.state.lock.width).toBe(false)
  })

  it('calculates outputWidth and outputHeight from wall × resolution', () => {
    const { result } = renderHook(() => useMetricState(null))
    // 8m * 3780 px/m = 30240
    expect(result.current.settings.outputWidth).toBe(30240)
    // 4.5m * 3780 px/m = 17010
    expect(result.current.settings.outputHeight).toBe(17010)
  })

  it('updates wall width', () => {
    const { result } = renderHook(() => useMetricState(null))
    act(() => result.current.setWall('width', 4.0))
    expect(result.current.state.wall.width).toBe(4.0)
  })

  it('setResolution updates outputWidth', () => {
    const { result } = renderHook(() => useMetricState(null))
    act(() => result.current.setResolution(1000))
    expect(result.current.settings.outputWidth).toBe(8000) // 8 * 1000
  })

  it('pixel lock prevents recalculation of outputWidth', () => {
    const { result } = renderHook(() => useMetricState(null))
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
    expect(result.current.settings.outputWidth).toBe(Math.floor(4.0 * 3780))
  })

  it('setLockPixels overrides outputHeight when height is locked', () => {
    const { result } = renderHook(() => useMetricState(null))
    act(() => result.current.toggleLock('height'))
    act(() => result.current.setLockPixels('height', 1200))
    expect(result.current.settings.outputHeight).toBe(1200)
  })

  it('aspect ratio lock adjusts height when width changes', () => {
    const { result } = renderHook(() => useMetricState(null))
    // AR = 8/4.5 ≈ 1.7778
    act(() => result.current.toggleLock('aspectRatio'))
    expect(result.current.state.lock.aspectRatio).toBe(true)
    act(() => result.current.setWall('width', 4.0))
    // height should be 4.0 / (8/4.5) = 4.0 * 4.5/8 = 2.25
    expect(result.current.state.wall.height).toBeCloseTo(2.25, 2)
  })

  it('aspect ratio lock adjusts width when height changes', () => {
    const { result } = renderHook(() => useMetricState(null))
    act(() => result.current.toggleLock('aspectRatio'))
    act(() => result.current.setWall('height', 2.25))
    // width = 2.25 * (8/4.5) = 4.0
    expect(result.current.state.wall.width).toBeCloseTo(4.0, 2)
  })

  it('initializes from preset with resolution', () => {
    const preset = {
      mode: 'metric', wall: { width: 5, height: 3 }, resolution: 2000,
      lock: { width: false, height: false, aspectRatio: false, pixelWidth: null, pixelHeight: null, arRatio: null },
      gridSubdivision: 0.5, patternType: 'dots',
      colors: { background: '#000', pattern: '#fff', text: '#fff', border: '#fff' },
    }
    const { result } = renderHook(() => useMetricState(preset))
    expect(result.current.state.wall.width).toBe(5)
    expect(result.current.state.resolution).toBe(2000)
    expect(result.current.settings.outputWidth).toBe(10000)
  })
})
