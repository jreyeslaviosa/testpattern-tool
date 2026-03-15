import { describe, it, expect, beforeEach } from 'vitest'
import { validatePreset, serializePreset, deserializePreset, loadLastPreset, saveLastPreset } from '../../src/utils/presets'

const validMetric = {
  mode: 'metric',
  wall: { width: 8, height: 4.5 },
  dpi: 96,
  lock: { width: false, height: false, pixelWidth: null, pixelHeight: null },
  gridSubdivision: 1,
  patternType: 'grid',
  colors: { background: '#fff', pattern: '#000', text: '#000', border: '#000' },
}

const validPixel = {
  mode: 'pixel',
  projectors: [{ label: 'P1', width: 1920, height: 1080, blend: { left: 0, right: 0, top: 0, bottom: 0 } }],
  display: { layoutDirection: 'horizontal', colorBars: false, showBlendZones: true, gridSize: 100, patternType: 'grid' },
  colors: { background: '#fff', pattern: '#000', text: '#000', blendZone: '#6366f1' },
}

describe('validatePreset', () => {
  it('accepts valid metric preset', () => {
    expect(validatePreset(validMetric)).toEqual({ valid: true, preset: validMetric })
  })
  it('accepts valid pixel preset', () => {
    expect(validatePreset(validPixel)).toEqual({ valid: true, preset: validPixel })
  })
  it('rejects missing mode', () => {
    const { valid } = validatePreset({ wall: {} })
    expect(valid).toBe(false)
  })
  it('rejects metric without wall', () => {
    const { valid } = validatePreset({ mode: 'metric' })
    expect(valid).toBe(false)
  })
  it('rejects pixel with empty projectors array', () => {
    const { valid } = validatePreset({ mode: 'pixel', projectors: [] })
    expect(valid).toBe(false)
  })
  it('filters out projectors missing width/height and rejects if none remain', () => {
    const preset = { ...validPixel, projectors: [{ label: 'bad' }] }
    const { valid } = validatePreset(preset)
    expect(valid).toBe(false)
  })
  it('filters out invalid projectors but keeps valid ones', () => {
    const preset = {
      ...validPixel,
      projectors: [
        { label: 'bad' },
        { label: 'P1', width: 1920, height: 1080, blend: { left: 0, right: 0, top: 0, bottom: 0 } },
      ],
    }
    const { valid, preset: result } = validatePreset(preset)
    expect(valid).toBe(true)
    expect(result.projectors).toHaveLength(1)
  })
  it('ignores unknown extra fields', () => {
    const { valid } = validatePreset({ ...validMetric, unknownField: 'foo' })
    expect(valid).toBe(true)
  })
})

describe('serializePreset / deserializePreset', () => {
  it('round-trips a metric preset', () => {
    const json = serializePreset(validMetric)
    expect(typeof json).toBe('string')
    const back = deserializePreset(json)
    expect(back.mode).toBe('metric')
  })
  it('returns null for invalid JSON', () => {
    expect(deserializePreset('not json')).toBeNull()
  })
})

describe('loadLastPreset / saveLastPreset', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when no preset saved', () => {
    expect(loadLastPreset()).toBeNull()
  })
  it('returns saved preset', () => {
    saveLastPreset(validMetric, 'test.json')
    const result = loadLastPreset()
    expect(result.mode).toBe('metric')
    expect(result._filename).toBe('test.json')
  })
})
