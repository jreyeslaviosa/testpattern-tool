// tests/utils/calculations.test.js
import { describe, it, expect } from 'vitest'
import { metersToPixels, calcGridTotal, calcGridPositions } from '../../src/utils/calculations'

describe('metersToPixels', () => {
  it('converts 1 meter at 96 DPI to 3779 pixels (floor)', () => {
    expect(metersToPixels(1, 96)).toBe(3779)
  })
  it('converts 8 meters at 96 DPI', () => {
    expect(metersToPixels(8, 96)).toBe(30236)
  })
  it('truncates to integer (floor)', () => {
    expect(typeof metersToPixels(1.5, 72)).toBe('number')
    expect(Number.isInteger(metersToPixels(1.5, 72))).toBe(true)
  })
})

describe('calcGridTotal', () => {
  it('1x1 no blend: total equals width x height', () => {
    expect(calcGridTotal({ rows: 1, cols: 1, width: 1920, height: 1080, blendH: 0, blendV: 0 }))
      .toEqual({ totalWidth: 1920, totalHeight: 1080 })
  })
  it('3x1 with blendH=40: totalWidth = 3*1920 - 2*40', () => {
    const { totalWidth } = calcGridTotal({ rows: 1, cols: 3, width: 1920, height: 1080, blendH: 40, blendV: 0 })
    expect(totalWidth).toBe(5680)
  })
  it('2x2 with blendH=40 and blendV=20', () => {
    const { totalWidth, totalHeight } = calcGridTotal({ rows: 2, cols: 2, width: 1920, height: 1080, blendH: 40, blendV: 20 })
    expect(totalWidth).toBe(3800)
    expect(totalHeight).toBe(2140)
  })
  it('1x1 with blends: blends have no effect on single cell', () => {
    const { totalWidth, totalHeight } = calcGridTotal({ rows: 1, cols: 1, width: 1920, height: 1080, blendH: 40, blendV: 20 })
    expect(totalWidth).toBe(1920)
    expect(totalHeight).toBe(1080)
  })
})

describe('calcGridPositions', () => {
  it('1x1: single cell at origin with col=0 row=0', () => {
    const pos = calcGridPositions({ rows: 1, cols: 1, width: 1920, height: 1080, blendH: 0, blendV: 0 })
    expect(pos).toEqual([{ x: 0, y: 0, col: 0, row: 0 }])
  })
  it('2x1 no blend: second cell at x=1920', () => {
    const pos = calcGridPositions({ rows: 1, cols: 2, width: 1920, height: 1080, blendH: 0, blendV: 0 })
    expect(pos[1]).toEqual({ x: 1920, y: 0, col: 1, row: 0 })
  })
  it('2x1 blendH=40: second cell at x=1880', () => {
    const pos = calcGridPositions({ rows: 1, cols: 2, width: 1920, height: 1080, blendH: 40, blendV: 0 })
    expect(pos[0]).toEqual({ x: 0, y: 0, col: 0, row: 0 })
    expect(pos[1]).toEqual({ x: 1880, y: 0, col: 1, row: 0 })
  })
  it('2x2 with blendH=40 and blendV=20: all 4 cells correct', () => {
    const pos = calcGridPositions({ rows: 2, cols: 2, width: 1920, height: 1080, blendH: 40, blendV: 20 })
    expect(pos).toEqual([
      { x: 0,    y: 0,    col: 0, row: 0 },
      { x: 1880, y: 0,    col: 1, row: 0 },
      { x: 0,    y: 1060, col: 0, row: 1 },
      { x: 1880, y: 1060, col: 1, row: 1 },
    ])
  })
  it('returns cells in row-major order', () => {
    const pos = calcGridPositions({ rows: 2, cols: 3, width: 1920, height: 1080, blendH: 0, blendV: 0 })
    expect(pos).toHaveLength(6)
    expect(pos[0]).toMatchObject({ col: 0, row: 0 })
    expect(pos[2]).toMatchObject({ col: 2, row: 0 })
    expect(pos[3]).toMatchObject({ col: 0, row: 1 })
  })
})
