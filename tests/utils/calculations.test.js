import { describe, it, expect } from 'vitest'
import {
  metersToPixels,
  calcPixelTotal,
  calcProjectorPositions,
} from '../../src/utils/calculations'

describe('metersToPixels', () => {
  it('converts 1 meter at 96 DPI to 3779 pixels (rounded)', () => {
    expect(metersToPixels(1, 96)).toBe(3779)
  })
  it('converts 8 meters at 96 DPI', () => {
    expect(metersToPixels(8, 96)).toBe(30236)
  })
  it('rounds to nearest integer', () => {
    expect(typeof metersToPixels(1.5, 72)).toBe('number')
    expect(Number.isInteger(metersToPixels(1.5, 72))).toBe(true)
  })
})

describe('calcPixelTotal — horizontal', () => {
  it('single projector: total = projector width', () => {
    const proj = [{ width: 1920, height: 1080, blend: { left: 0, right: 0, top: 0, bottom: 0 } }]
    const { totalWidth, totalHeight } = calcPixelTotal(proj, 'horizontal')
    expect(totalWidth).toBe(1920)
    expect(totalHeight).toBe(1080)
  })
  it('two projectors no blend', () => {
    const proj = [
      { width: 1920, height: 1080, blend: { left: 0, right: 0, top: 0, bottom: 0 } },
      { width: 1920, height: 1080, blend: { left: 0, right: 0, top: 0, bottom: 0 } },
    ]
    const { totalWidth } = calcPixelTotal(proj, 'horizontal')
    expect(totalWidth).toBe(3840)
  })
  it('two projectors with blend_right on first', () => {
    const proj = [
      { width: 1920, height: 1080, blend: { left: 0, right: 40, top: 0, bottom: 0 } },
      { width: 1920, height: 1080, blend: { left: 0, right: 0, top: 0, bottom: 0 } },
    ]
    const { totalWidth } = calcPixelTotal(proj, 'horizontal')
    expect(totalWidth).toBe(3800)
  })
  it('three projectors: only first two blend_right subtracted', () => {
    const proj = [
      { width: 1920, height: 1080, blend: { left: 0, right: 40, top: 0, bottom: 0 } },
      { width: 1920, height: 1080, blend: { left: 0, right: 40, top: 0, bottom: 0 } },
      { width: 1920, height: 1080, blend: { left: 0, right: 40, top: 0, bottom: 0 } },
    ]
    const { totalWidth } = calcPixelTotal(proj, 'horizontal')
    expect(totalWidth).toBe(5680) // 5760 - 80
  })
  it('height is max of all projectors', () => {
    const proj = [
      { width: 1920, height: 1080, blend: { left: 0, right: 0, top: 0, bottom: 0 } },
      { width: 1920, height: 2160, blend: { left: 0, right: 0, top: 0, bottom: 0 } },
    ]
    const { totalHeight } = calcPixelTotal(proj, 'horizontal')
    expect(totalHeight).toBe(2160)
  })
})

describe('calcPixelTotal — vertical', () => {
  it('two projectors with blend_bottom on first', () => {
    const proj = [
      { width: 1920, height: 1080, blend: { left: 0, right: 0, top: 0, bottom: 40 } },
      { width: 1920, height: 1080, blend: { left: 0, right: 0, top: 0, bottom: 0 } },
    ]
    const { totalWidth, totalHeight } = calcPixelTotal(proj, 'vertical')
    expect(totalHeight).toBe(2120)
    expect(totalWidth).toBe(1920)
  })
})

describe('calcProjectorPositions — horizontal', () => {
  it('first projector starts at 0,0', () => {
    const proj = [{ width: 1920, height: 1080, blend: { left: 0, right: 0, top: 0, bottom: 0 } }]
    const positions = calcProjectorPositions(proj, 'horizontal')
    expect(positions[0]).toEqual({ x: 0, y: 0 })
  })
  it('second projector x = first width - first blend_right', () => {
    const proj = [
      { width: 1920, height: 1080, blend: { left: 0, right: 40, top: 0, bottom: 0 } },
      { width: 1920, height: 1080, blend: { left: 0, right: 0, top: 0, bottom: 0 } },
    ]
    const positions = calcProjectorPositions(proj, 'horizontal')
    expect(positions[1]).toEqual({ x: 1880, y: 0 })
  })
})

describe('calcProjectorPositions — vertical', () => {
  it('second projector y = first height - first blend_bottom', () => {
    const proj = [
      { width: 1920, height: 1080, blend: { left: 0, right: 0, top: 0, bottom: 40 } },
      { width: 1920, height: 1080, blend: { left: 0, right: 0, top: 0, bottom: 0 } },
    ]
    const positions = calcProjectorPositions(proj, 'vertical')
    expect(positions[1]).toEqual({ x: 0, y: 1040 })
  })
})
