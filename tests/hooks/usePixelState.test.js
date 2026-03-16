// tests/hooks/usePixelState.test.js
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePixelState } from '../../src/hooks/usePixelState'

describe('usePixelState', () => {
  it('initializes with one projector at 1920×1080', () => {
    const { result } = renderHook(() => usePixelState(null))
    expect(result.current.state.projectors).toHaveLength(1)
    expect(result.current.state.projectors[0].width).toBe(1920)
  })

  it('calculates outputWidth from single projector', () => {
    const { result } = renderHook(() => usePixelState(null))
    expect(result.current.settings.outputWidth).toBe(1920)
    expect(result.current.settings.outputHeight).toBe(1080)
  })

  it('adds a projector', () => {
    const { result } = renderHook(() => usePixelState(null))
    act(() => result.current.addProjector())
    expect(result.current.state.projectors).toHaveLength(2)
  })

  it('removes a projector but not the last one', () => {
    const { result } = renderHook(() => usePixelState(null))
    act(() => result.current.addProjector())
    act(() => result.current.removeProjector(1))
    expect(result.current.state.projectors).toHaveLength(1)
    act(() => result.current.removeProjector(0))
    expect(result.current.state.projectors).toHaveLength(1) // can't remove last
  })

  it('updates projector field', () => {
    const { result } = renderHook(() => usePixelState(null))
    act(() => result.current.updateProjector(0, 'width', 3840))
    expect(result.current.state.projectors[0].width).toBe(3840)
  })

  it('recalculates total with two projectors and blend', () => {
    const { result } = renderHook(() => usePixelState(null))
    act(() => result.current.addProjector())
    act(() => result.current.updateProjectorBlend(0, 'right', 40))
    expect(result.current.settings.outputWidth).toBe(3800)
  })

  it('positions are recalculated', () => {
    const { result } = renderHook(() => usePixelState(null))
    act(() => result.current.addProjector())
    act(() => result.current.updateProjectorBlend(0, 'right', 40))
    expect(result.current.settings.positions[1].x).toBe(1880)
  })
})
