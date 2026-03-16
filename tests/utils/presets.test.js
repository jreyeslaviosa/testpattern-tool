// tests/utils/presets.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import {
  validatePreset, serializePreset, deserializePreset,
  loadLastPreset, saveLastPreset, migratePixelPreset,
} from '../../src/utils/presets'

const validMetric = {
  mode: 'metric',
  wall: { width: 8, height: 4.5 },
  resolution: 3780,
  lock: { width: false, height: false, aspectRatio: false, pixelWidth: null, pixelHeight: null, arRatio: null },
  gridSubdivision: 1,
  patternType: 'grid',
  colors: { background: '#fff', pattern: '#000', text: '#000', border: '#000' },
}

const validPixel = {
  mode: 'pixel',
  grid: { rows: 1, cols: 2, width: 1920, height: 1080, blendH: 0, blendV: 0 },
  display: {
    colorBars: false, showBlendZones: true, gridSize: 100, textSize: 14,
    patternType: 'grid', showCircles: true, title: '',
  },
  colors: { background: '#000', pattern: '#fff', text: '#fff', blendZone: '#6366f1' },
}

const oldPixelSingle = {
  mode: 'pixel',
  projectors: [{ label: 'P1', width: 1920, height: 1080, blend: { left: 0, right: 40, top: 0, bottom: 0 } }],
  display: { layoutDirection: 'horizontal', colorBars: false, showBlendZones: true, gridSize: 100, patternType: 'grid' },
  colors: { background: '#fff', pattern: '#000', text: '#000', blendZone: '#6366f1' },
}

describe('migratePixelPreset', () => {
  it('passes through new-format preset unchanged', () => {
    const { migrated, warningSkipped } = migratePixelPreset(validPixel)
    expect(migrated).toEqual(validPixel)
    expect(warningSkipped).toBe(false)
  })

  it('passes through non-pixel preset unchanged', () => {
    const { migrated, warningSkipped } = migratePixelPreset(validMetric)
    expect(migrated).toEqual(validMetric)
    expect(warningSkipped).toBe(false)
  })

  it('converts single old-format projector to grid', () => {
    const { migrated, warningSkipped } = migratePixelPreset(oldPixelSingle)
    expect(migrated.grid).toEqual({ rows: 1, cols: 1, width: 1920, height: 1080, blendH: 40, blendV: 0 })
    expect(migrated.projectors).toBeUndefined()
    expect(warningSkipped).toBe(false)
  })

  it('converts multi-projector old preset: cols = projectors.length', () => {
    const preset = {
      ...oldPixelSingle,
      projectors: [
        { label: 'P1', width: 1920, height: 1080, blend: { left: 0, right: 40, top: 0, bottom: 0 } },
        { label: 'P2', width: 1920, height: 1080, blend: { left: 0, right: 40, top: 0, bottom: 0 } },
      ],
    }
    const { migrated } = migratePixelPreset(preset)
    expect(migrated.grid.cols).toBe(2)
    expect(migrated.grid.rows).toBe(1)
  })

  it('blendV is always 0 for migrated horizontal presets', () => {
    const { migrated } = migratePixelPreset(oldPixelSingle)
    expect(migrated.grid.blendV).toBe(0)
  })

  it('sets warningSkipped=true when projectors have non-uniform sizes', () => {
    const preset = {
      ...oldPixelSingle,
      projectors: [
        { label: 'P1', width: 1920, height: 1080, blend: { left: 0, right: 0, top: 0, bottom: 0 } },
        { label: 'P2', width: 1024, height: 768,  blend: { left: 0, right: 0, top: 0, bottom: 0 } },
      ],
    }
    const { warningSkipped } = migratePixelPreset(preset)
    expect(warningSkipped).toBe(true)
  })

  it('drops layoutDirection from display', () => {
    const { migrated } = migratePixelPreset(oldPixelSingle)
    expect(migrated.display).not.toHaveProperty('layoutDirection')
  })
})

describe('validatePreset', () => {
  it('accepts valid metric preset', () => {
    expect(validatePreset(validMetric)).toMatchObject({ valid: true })
  })

  it('accepts valid new pixel preset', () => {
    expect(validatePreset(validPixel)).toMatchObject({ valid: true })
  })

  it('rejects missing mode', () => {
    expect(validatePreset({ wall: {} })).toMatchObject({ valid: false })
  })

  it('rejects metric without wall', () => {
    expect(validatePreset({ mode: 'metric' })).toMatchObject({ valid: false })
  })

  it('rejects pixel preset missing grid', () => {
    expect(validatePreset({ mode: 'pixel', display: {}, colors: {} })).toMatchObject({ valid: false })
  })

  it('rejects blendH >= width', () => {
    const preset = { ...validPixel, grid: { ...validPixel.grid, blendH: 1920 } }
    expect(validatePreset(preset)).toMatchObject({ valid: false })
  })

  it('rejects invalid patternType', () => {
    const preset = { ...validPixel, display: { ...validPixel.display, patternType: 'invalid' } }
    expect(validatePreset(preset)).toMatchObject({ valid: false })
  })

  it('fills missing optional display fields from defaults', () => {
    const preset = {
      ...validPixel,
      display: { patternType: 'grid', gridSize: 100, textSize: 14 },
    }
    const { preset: result } = validatePreset(preset)
    expect(result.display.colorBars).toBe(false)
    expect(result.display.showCircles).toBe(true)
    expect(result.display.title).toBe('')
    expect(result.display.showBlendZones).toBe(true)
  })

  it('ignores unknown extra fields', () => {
    expect(validatePreset({ ...validMetric, unknownField: 'foo' })).toMatchObject({ valid: true })
  })

  it('migrates old dpi field to resolution for metric preset', () => {
    const old = { mode: 'metric', wall: { width: 8, height: 4.5 }, dpi: 96 }
    const { valid, preset } = validatePreset(old)
    expect(valid).toBe(true)
    expect(preset.resolution).toBe(Math.round(96 / 0.0254))
    expect(preset.dpi).toBeUndefined()
  })
})

describe('serializePreset / deserializePreset', () => {
  it('round-trips a metric preset', () => {
    const json = serializePreset(validMetric)
    expect(typeof json).toBe('string')
    expect(deserializePreset(json).mode).toBe('metric')
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

  it('migrates old pixel preset from localStorage', () => {
    saveLastPreset(oldPixelSingle, 'old.json')
    const result = loadLastPreset()
    expect(result.grid).toBeDefined()
    expect(result.projectors).toBeUndefined()
  })
})
