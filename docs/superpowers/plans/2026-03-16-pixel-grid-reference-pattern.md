# Pixel Grid & Reference Pattern Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat projector list in Pixel Pattern Mode with a uniform rows×cols grid, add a "reference" pattern type with circles/labels/crosshair/title, move SMPTE color bars to centered overlay, and add text size control.

**Architecture:** A uniform `grid` object (rows, cols, width, height, blendH, blendV) replaces the `projectors` array. Two new calculation functions (`calcGridTotal`, `calcGridPositions`) replace the old ones. `drawPixelPattern` gains a reference rendering path. Old presets auto-migrate via `migratePixelPreset`.

**Tech Stack:** React, HTML5 Canvas, Vitest 4, @testing-library/react

---

## Chunk 1: Calculations, Presets, State Hook

### Task 1: Grid calculations

**Files:**
- Modify: `src/utils/calculations.js`
- Modify: `tests/utils/calculations.test.js`

Context: `src/utils/calculations.js` currently exports `metersToPixels`, `calcPixelTotal`, and `calcProjectorPositions`. We keep `metersToPixels` unchanged and replace the other two with `calcGridTotal` and `calcGridPositions`.

- [ ] **Step 1: Write failing tests for `calcGridTotal` and `calcGridPositions`**

Replace the **entire file** `tests/utils/calculations.test.js` with (this removes the old calcPixelTotal/calcProjectorPositions tests and updates the imports):

```js
// tests/utils/calculations.test.js
import { describe, it, expect } from 'vitest'
import { metersToPixels, calcGridTotal, calcGridPositions } from '../../src/utils/calculations'

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

describe('calcGridTotal', () => {
  it('1×1 no blend: total equals width × height', () => {
    expect(calcGridTotal({ rows: 1, cols: 1, width: 1920, height: 1080, blendH: 0, blendV: 0 }))
      .toEqual({ totalWidth: 1920, totalHeight: 1080 })
  })
  it('3×1 with blendH=40: totalWidth = 3*1920 - 2*40', () => {
    const { totalWidth } = calcGridTotal({ rows: 1, cols: 3, width: 1920, height: 1080, blendH: 40, blendV: 0 })
    expect(totalWidth).toBe(5680)
  })
  it('2×2 with blendH=40 and blendV=20', () => {
    const { totalWidth, totalHeight } = calcGridTotal({ rows: 2, cols: 2, width: 1920, height: 1080, blendH: 40, blendV: 20 })
    expect(totalWidth).toBe(3800)  // 2*1920 - 1*40
    expect(totalHeight).toBe(2140) // 2*1080 - 1*20
  })
  it('1×1 with blends: blends have no effect on single cell', () => {
    const { totalWidth, totalHeight } = calcGridTotal({ rows: 1, cols: 1, width: 1920, height: 1080, blendH: 40, blendV: 20 })
    expect(totalWidth).toBe(1920)
    expect(totalHeight).toBe(1080)
  })
})

describe('calcGridPositions', () => {
  it('1×1: single cell at origin with col=0 row=0', () => {
    const pos = calcGridPositions({ rows: 1, cols: 1, width: 1920, height: 1080, blendH: 0, blendV: 0 })
    expect(pos).toEqual([{ x: 0, y: 0, col: 0, row: 0 }])
  })
  it('2×1 no blend: second cell at x=1920', () => {
    const pos = calcGridPositions({ rows: 1, cols: 2, width: 1920, height: 1080, blendH: 0, blendV: 0 })
    expect(pos[1]).toEqual({ x: 1920, y: 0, col: 1, row: 0 })
  })
  it('2×1 blendH=40: second cell at x=1880', () => {
    const pos = calcGridPositions({ rows: 1, cols: 2, width: 1920, height: 1080, blendH: 40, blendV: 0 })
    expect(pos[0]).toEqual({ x: 0, y: 0, col: 0, row: 0 })
    expect(pos[1]).toEqual({ x: 1880, y: 0, col: 1, row: 0 })
  })
  it('2×2 with blendH=40 and blendV=20: all 4 cells correct', () => {
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run 2>&1 | grep -E "FAIL|PASS|calcGrid"
```

Expected: FAIL — `calcGridTotal` and `calcGridPositions` not exported.

- [ ] **Step 3: Implement `calcGridTotal` and `calcGridPositions`, remove old functions**

Replace `src/utils/calculations.js` with:

```js
// src/utils/calculations.js

/**
 * Convert meters to pixels.
 * Formula: pixels = (meters / 0.0254) * dpi
 */
export function metersToPixels(meters, dpi) {
  return Math.floor((meters / 0.0254) * dpi)
}

/**
 * Calculate total composite canvas size from a uniform grid config.
 *
 * totalWidth  = cols * width  - (cols - 1) * blendH
 * totalHeight = rows * height - (rows - 1) * blendV
 *
 * @param {{ rows, cols, width, height, blendH, blendV }} grid
 * @returns {{ totalWidth: number, totalHeight: number }}
 */
export function calcGridTotal(grid) {
  const totalWidth  = grid.cols * grid.width  - (grid.cols - 1) * grid.blendH
  const totalHeight = grid.rows * grid.height - (grid.rows - 1) * grid.blendV
  return { totalWidth, totalHeight }
}

/**
 * Calculate the (x, y, col, row) origin of each cell in the composite canvas.
 *
 * Returns a flat row-major array. The formula applies uniformly to all cells
 * including the last column/row.
 *   x = col * (width  - blendH)
 *   y = row * (height - blendV)
 *
 * @param {{ rows, cols, width, height, blendH, blendV }} grid
 * @returns {Array<{ x: number, y: number, col: number, row: number }>}
 */
export function calcGridPositions(grid) {
  const positions = []
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      positions.push({
        x: col * (grid.width  - grid.blendH),
        y: row * (grid.height - grid.blendV),
        col,
        row,
      })
    }
  }
  return positions
}
```

- [ ] **Step 4: Run tests and verify all pass**

```bash
npm test -- --run 2>&1 | tail -8
```

Expected: all tests pass (some tests in other files that import old functions will fail — that's fine for now, we fix them in subsequent tasks).

- [ ] **Step 5: Commit**

```bash
git add src/utils/calculations.js tests/utils/calculations.test.js
git commit -m "feat: replace calcPixelTotal/Positions with calcGridTotal/Positions"
```

---

### Task 2: Preset migration and updated `validatePreset`

**Files:**
- Modify: `src/utils/presets.js`
- Modify: `tests/utils/presets.test.js`

Context: `validatePreset` currently accepts pixel presets with a `projectors` array. We need to: (1) add `migratePixelPreset` to convert old presets, (2) update `validatePreset` to accept the new `grid`-based shape, (3) call migration in both `readPresetFile` and `loadLastPreset`.

- [ ] **Step 1: Write failing tests**

Replace the **entire file** `tests/utils/presets.test.js` with (this updates `validPixel` to the new grid shape and removes old projectors-based tests; `PIXEL_DISPLAY_DEFAULTS` is a module-level const defined inside `presets.js`):

```js
// tests/utils/presets.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import {
  validatePreset, serializePreset, deserializePreset,
  loadLastPreset, saveLastPreset, migratePixelPreset,
} from '../../src/utils/presets'

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
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
npm test -- --run tests/utils/presets.test.js 2>&1 | tail -15
```

Expected: failures on `migratePixelPreset` not exported and updated `validatePreset` tests.

- [ ] **Step 3: Implement changes in `src/utils/presets.js`**

Replace `src/utils/presets.js` with:

```js
// src/utils/presets.js

const PIXEL_DISPLAY_DEFAULTS = {
  colorBars: false,
  showBlendZones: true,
  gridSize: 100,
  textSize: 14,
  patternType: 'grid',
  showCircles: true,
  title: '',
}

/**
 * Migrate an old-format pixel preset (projectors array) to the new grid format.
 * Returns the preset unchanged if it's not pixel mode or already has a grid object.
 *
 * @param {unknown} raw
 * @returns {{ migrated: unknown, warningSkipped: boolean }}
 */
export function migratePixelPreset(raw) {
  if (!raw || typeof raw !== 'object') return { migrated: raw, warningSkipped: false }
  if (raw.mode !== 'pixel' || raw.grid) return { migrated: raw, warningSkipped: false }

  const projectors = Array.isArray(raw.projectors) ? raw.projectors : []
  if (projectors.length === 0) return { migrated: raw, warningSkipped: false }

  const p0 = projectors[0]
  const nonUniform = projectors.some(p => p.width !== p0.width || p.height !== p0.height)

  const { projectors: _proj, ...rest } = raw
  const { layoutDirection: _ld, ...displayRest } = rest.display || {}

  return {
    migrated: {
      ...rest,
      display: displayRest,
      grid: {
        rows: 1,
        cols: projectors.length,
        width: p0.width,
        height: p0.height,
        blendH: p0.blend?.right ?? 0,
        blendV: 0,
      },
    },
    warningSkipped: nonUniform,
  }
}

/**
 * Validate a preset object loaded from JSON or localStorage.
 *
 * @param {unknown} raw
 * @returns {{ valid: boolean, preset?: object, error?: string, warningSkipped?: boolean }}
 */
export function validatePreset(raw) {
  if (!raw || typeof raw !== 'object') return { valid: false, error: 'Not an object' }
  if (!raw.mode || !['metric', 'pixel'].includes(raw.mode)) {
    return { valid: false, error: 'Missing or invalid mode' }
  }

  if (raw.mode === 'metric') {
    if (!raw.wall || typeof raw.wall.width !== 'number' || typeof raw.wall.height !== 'number') {
      return { valid: false, error: 'Missing wall dimensions' }
    }
    return { valid: true, preset: raw }
  }

  if (raw.mode === 'pixel') {
    const g = raw.grid
    if (!g || typeof g !== 'object') return { valid: false, error: 'Missing grid' }
    if (!Number.isInteger(g.rows) || g.rows < 1) return { valid: false, error: 'Invalid grid.rows' }
    if (!Number.isInteger(g.cols) || g.cols < 1) return { valid: false, error: 'Invalid grid.cols' }
    if (typeof g.width !== 'number' || g.width < 1) return { valid: false, error: 'Invalid grid.width' }
    if (typeof g.height !== 'number' || g.height < 1) return { valid: false, error: 'Invalid grid.height' }
    if (typeof g.blendH !== 'number' || g.blendH < 0 || g.blendH >= g.width) {
      return { valid: false, error: 'Invalid grid.blendH' }
    }
    if (typeof g.blendV !== 'number' || g.blendV < 0 || g.blendV >= g.height) {
      return { valid: false, error: 'Invalid grid.blendV' }
    }

    const allowedPatterns = ['grid', 'dots', 'crosshatch', 'solid', 'gradient', 'reference']
    const d = raw.display || {}
    if (d.patternType && !allowedPatterns.includes(d.patternType)) {
      return { valid: false, error: 'Invalid patternType' }
    }

    const display = { ...PIXEL_DISPLAY_DEFAULTS, ...d }
    return { valid: true, preset: { ...raw, display } }
  }

  return { valid: false, error: 'Unknown mode' }
}

/**
 * Serialize a preset state object to a pretty-printed JSON string.
 */
export function serializePreset(state) {
  return JSON.stringify(state, null, 2)
}

/**
 * Deserialize a JSON string back to a preset object.
 * Returns null on parse failure rather than throwing.
 */
export function deserializePreset(json) {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * Persist the current preset and filename to localStorage.
 */
export function saveLastPreset(preset, filename) {
  try {
    localStorage.setItem('lastPreset', JSON.stringify({ ...preset, _filename: filename }))
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Load the most recently saved preset from localStorage.
 * Runs migration on old-format pixel presets before returning.
 * Returns null if nothing stored or parsing fails.
 */
export function loadLastPreset() {
  try {
    const raw = localStorage.getItem('lastPreset')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const { migrated } = migratePixelPreset(parsed)
    return migrated
  } catch {
    return null
  }
}

/**
 * Trigger a browser download of the preset as a JSON file and persist to localStorage.
 */
export function downloadPreset(state, filename = 'preset.json') {
  saveLastPreset(state, filename)
  const blob = new Blob([serializePreset(state)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Read a File object as text, parse, migrate, and validate.
 * Throws if the file is not valid JSON or fails validation.
 */
export async function readPresetFile(file) {
  const text = await file.text()
  const raw = deserializePreset(text)
  if (!raw) throw new Error('Invalid preset file')
  const { migrated, warningSkipped: migrationWarning } = migratePixelPreset(raw)
  const result = validatePreset(migrated)
  if (!result.valid) throw new Error('Invalid preset file')
  return {
    preset: { ...result.preset, _filename: file.name },
    warningSkipped: result.warningSkipped || migrationWarning,
  }
}
```

- [ ] **Step 4: Run all tests and verify pass**

```bash
npm test -- --run 2>&1 | tail -8
```

Expected: preset tests pass. Some other test files may still fail (usePixelState tests import old hook API) — that's OK, fixed in Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/utils/presets.js tests/utils/presets.test.js
git commit -m "feat: add migratePixelPreset and update validatePreset for grid schema"
```

---

### Task 3: `usePixelState` hook rewrite

**Files:**
- Modify: `src/hooks/usePixelState.js`
- Modify: `tests/hooks/usePixelState.test.js`

Context: The hook currently manages a `projectors` array with per-projector mutation functions. We replace it with a `grid` object and simplified `setGrid`, `setDisplay`, `setColor`, `applyPreset` API.

- [ ] **Step 1: Write failing tests**

Replace the **entire file** `tests/hooks/usePixelState.test.js` with (this removes all old projector-array-based tests and replaces with grid-model tests):

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run tests/hooks/usePixelState.test.js 2>&1 | tail -15
```

Expected: failures — `setGrid` not a function, state shape mismatch.

- [ ] **Step 3: Implement new `usePixelState`**

Replace `src/hooks/usePixelState.js` with:

```js
// src/hooks/usePixelState.js
import { useState, useMemo } from 'react'
import { calcGridTotal, calcGridPositions } from '../utils/calculations'

const DEFAULTS = {
  mode: 'pixel',
  grid: {
    rows: 1,
    cols: 2,
    width: 1920,
    height: 1080,
    blendH: 0,
    blendV: 0,
  },
  display: {
    colorBars: false,
    showBlendZones: true,
    gridSize: 100,
    textSize: 14,
    patternType: 'grid',
    showCircles: true,
    title: '',
  },
  colors: {
    background: '#000000',
    pattern: '#ffffff',
    text: '#ffffff',
    blendZone: '#6366f1',
  },
}

export function usePixelState(initialPreset) {
  const [state, setState] = useState(() =>
    initialPreset ? { ...DEFAULTS, ...initialPreset } : DEFAULTS
  )

  const settings = useMemo(() => {
    const { totalWidth, totalHeight } = calcGridTotal(state.grid)
    const positions = calcGridPositions(state.grid)
    return {
      ...state,
      outputWidth: totalWidth,
      outputHeight: totalHeight,
      positions,
    }
  }, [state])

  function setGrid(key, value) {
    setState(s => ({ ...s, grid: { ...s.grid, [key]: value } }))
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

  return { state, settings, setGrid, setDisplay, setColor, applyPreset }
}
```

- [ ] **Step 4: Run all tests and verify pass**

```bash
npm test -- --run 2>&1 | tail -8
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePixelState.js tests/hooks/usePixelState.test.js
git commit -m "feat: rewrite usePixelState with grid model and setGrid API"
```

---

## Chunk 2: Drawing and UI

### Task 4: `drawPixelPattern` rewrite

**Files:**
- Modify: `src/utils/draw/drawPixelPattern.js`

Context: `settings` now has `grid` and `positions` (with `col`/`row` fields) instead of `projectors`. Color bars move to centered overlay. A new reference pattern type is added. The old function signature used `projectors` and `positions` without `col`/`row`.

No unit tests for canvas drawing — verified visually via dev server.

- [ ] **Step 1: Replace `src/utils/draw/drawPixelPattern.js`**

```js
// src/utils/draw/drawPixelPattern.js

const SMPTE_BARS = [
  '#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0',
]

export function drawPixelPattern(ctx, settings) {
  const { outputWidth: w, outputHeight: h, grid, positions, display, colors } = settings
  const { colorBars, showBlendZones, gridSize, textSize, patternType } = display
  const cellW = grid.width
  const cellH = grid.height

  // 1. Background
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, w, h)

  if (patternType === 'reference') {
    drawReferenceInner(ctx, w, h, cellW, cellH, grid, positions, display, colors)
  } else {
    // 2. Pattern (full canvas)
    drawPattern(ctx, w, h, gridSize, patternType, colors)

    // 3. Cell boundary dashes
    ctx.strokeStyle = colors.pattern
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    positions.forEach(({ x, y }) => ctx.strokeRect(x, y, cellW, cellH))
    ctx.setLineDash([])

    // 4. Cell labels (col+1, row+1) at top-left of each cell
    const lblSize = Math.max(10, Math.round(cellH * 0.02))
    ctx.font = `bold ${lblSize}px monospace`
    ctx.fillStyle = colors.text
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    positions.forEach(({ x, y, col, row }) => {
      ctx.fillText(`${col + 1},${row + 1}`, x + 8, y + 8)
    })

    // 5. Total dimensions label (bottom-left)
    ctx.font = `${Math.max(10, Math.round(h * 0.015))}px monospace`
    ctx.textBaseline = 'bottom'
    ctx.fillText(`${w}×${h}px total`, 10, h - 6)
  }

  // Color bars — centered overlay (all pattern types)
  if (colorBars) {
    const barH = Math.max(40, Math.round(h * 0.1))
    const barY = Math.round((h - barH) / 2)
    const barW = w / 7
    SMPTE_BARS.forEach((color, i) => {
      ctx.fillStyle = color
      ctx.fillRect(Math.round(i * barW), barY, Math.round(barW), barH)
    })
  }

  // Blend zone overlays (all pattern types)
  if (showBlendZones) {
    ctx.globalAlpha = 0.3
    ctx.fillStyle = colors.blendZone
    positions.forEach(({ x, y, col, row }) => {
      if (col > 0 && grid.blendH > 0)
        ctx.fillRect(x, y, grid.blendH, cellH)
      if (col < grid.cols - 1 && grid.blendH > 0)
        ctx.fillRect(x + cellW - grid.blendH, y, grid.blendH, cellH)
      if (row > 0 && grid.blendV > 0)
        ctx.fillRect(x, y, cellW, grid.blendV)
      if (row < grid.rows - 1 && grid.blendV > 0)
        ctx.fillRect(x, y + cellH - grid.blendV, cellW, grid.blendV)
    })
    ctx.globalAlpha = 1
  }
}

function drawReferenceInner(ctx, w, h, cellW, cellH, grid, positions, display, colors) {
  const { gridSize, textSize, showCircles, title } = display
  const { cols, rows, blendH, blendV } = grid

  // Layer 2: Grid lines
  drawPattern(ctx, w, h, gridSize, 'grid', colors)

  // Layer 3: Inscribed circles
  if (showCircles) {
    const radius = Math.floor(Math.min(cellW, cellH) / 2) - 10
    if (radius > 0) {
      ctx.strokeStyle = colors.pattern
      ctx.lineWidth = 1
      positions.forEach(({ x, y }) => {
        ctx.beginPath()
        ctx.arc(x + cellW / 2, y + cellH / 2, radius, 0, Math.PI * 2)
        ctx.stroke()
      })
    }
  }

  // Layer 4: Center crosshair
  ctx.strokeStyle = colors.pattern
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2)
  ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h)
  ctx.stroke()

  // Layer 5: Edge labels
  ctx.font = textSize + 'px monospace'
  ctx.fillStyle = colors.text

  // Column numbers (omit all when cell too narrow)
  if (cellW >= 2 * textSize) {
    ctx.textAlign = 'center'
    for (let col = 0; col < cols; col++) {
      const lx = col * (cellW - blendH) + cellW / 2
      ctx.textBaseline = 'top'
      ctx.fillText(String(col + 1), lx, 4)
      ctx.textBaseline = 'bottom'
      ctx.fillText(String(col + 1), lx, h - 4)
    }
  }

  // Row letters A–Z (omit all when rows > 26)
  if (rows <= 26) {
    ctx.textBaseline = 'middle'
    for (let row = 0; row < rows; row++) {
      const ly = row * (cellH - blendV) + cellH / 2
      const letter = String.fromCharCode(65 + row)
      ctx.textAlign = 'left';  ctx.fillText(letter, 4, ly)
      ctx.textAlign = 'right'; ctx.fillText(letter, w - 4, ly)
    }
  }

  // Layer 6: Title
  if (title) {
    ctx.font = Math.round(textSize * 3) + 'px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = colors.text
    ctx.fillText(title, w / 2, h / 2)
  }

  // Layer 7: Info text (below title)
  const ratio = (w / h).toFixed(2)
  ctx.font = Math.round(textSize * 1.2) + 'px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = colors.text
  ctx.fillText(
    `${w}×${h}px  ·  ${ratio}:1  ·  ${cols}×${rows} cells`,
    w / 2,
    h / 2 + Math.round(textSize * 3 / 2) + 8
  )
}

function drawPattern(ctx, w, h, interval, type, colors) {
  if (!interval || interval <= 0 || type === 'solid') return

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w, h)
  ctx.clip()

  ctx.strokeStyle = colors.pattern
  ctx.fillStyle = colors.pattern

  if (type === 'grid') {
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= w; x += interval) { ctx.moveTo(x, 0); ctx.lineTo(x, h) }
    for (let y = 0; y <= h; y += interval) { ctx.moveTo(0, y); ctx.lineTo(w, y) }
    ctx.stroke()
  } else if (type === 'dots') {
    for (let x = 0; x <= w; x += interval) {
      for (let y = 0; y <= h; y += interval) {
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill()
      }
    }
  } else if (type === 'crosshatch') {
    ctx.lineWidth = 1
    ctx.beginPath()
    const diag = Math.max(w, h) * 2
    for (let i = -diag; i <= diag; i += interval) {
      ctx.moveTo(i, 0); ctx.lineTo(i + h, h)
      ctx.moveTo(i, 0); ctx.lineTo(i - h, h)
    }
    ctx.stroke()
  } else if (type === 'gradient') {
    const hGrad = ctx.createLinearGradient(0, 0, w, 0)
    hGrad.addColorStop(0, colors.pattern)
    hGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = hGrad
    ctx.fillRect(0, 0, w, h)
    const vGrad = ctx.createLinearGradient(0, 0, 0, h)
    vGrad.addColorStop(0, hexToRgba(colors.pattern, 0.5))
    vGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = vGrad
    ctx.fillRect(0, 0, w, h)
  }

  ctx.restore()
}

function hexToRgba(hex, alpha) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return `rgba(0,0,0,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
```

- [ ] **Step 2: Run all tests to verify nothing broken**

```bash
npm test -- --run 2>&1 | tail -8
```

Expected: all tests still pass (canvas code not unit tested).

- [ ] **Step 3: Start dev server and verify drawing visually**

```bash
npm run dev
```

Open http://localhost:5173 → Pixel Pattern Mode. Verify:
- Grid pattern shows cell boundaries and labels
- Color bars (when enabled) appear centered, not at the top
- Select "reference" pattern type → see grid + circles + crosshair + info text
- Type a title in the Title field → appears in canvas center

- [ ] **Step 4: Commit**

```bash
git add src/utils/draw/drawPixelPattern.js
git commit -m "feat: add reference pattern type and centered color bars to drawPixelPattern"
```

---

### Task 5: `PixelPatternMode` UI rewrite + delete `ProjectorCard`

**Files:**
- Modify: `src/components/PixelPatternMode.jsx`
- Delete: `src/components/ProjectorCard.jsx`

Context: Remove the ProjectorCard list and layout direction toggle. Replace with grid config inputs (cols, rows, width, height, blendH, blendV). Add textSize input. Add Reference section (title, showCircles) shown only when patternType='reference'. Add 'reference' to the pattern dropdown.

The `handleImport` function stays the same (cross-mode redirect logic unchanged). The `validatePixel` function gets rewritten for the new state shape.

- [ ] **Step 1: Rewrite `src/components/PixelPatternMode.jsx`**

```jsx
// src/components/PixelPatternMode.jsx
import { useRef, useState } from 'react'
import { usePixelState } from '../hooks/usePixelState'
import CanvasPreview from './CanvasPreview'
import ColorPicker from './ColorPicker'
import ThemeToggle from './ThemeToggle'
import { downloadPreset, readPresetFile } from '../utils/presets'
import { exportPng } from '../utils/exportPng'

export default function PixelPatternMode({ onHome, onNavigate, initialPreset, theme, onThemeToggle }) {
  const { state, settings, setGrid, setDisplay, setColor, applyPreset } = usePixelState(initialPreset)
  const [toast, setToast] = useState(null)
  const fileRef = useRef(null)

  const errors = validatePixel(state)
  const hasErrors = Object.keys(errors).length > 0

  function showToast(msg, isError = false) {
    setToast({ msg, isError })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const { preset, warningSkipped } = await readPresetFile(file)
      if (preset.mode === 'metric') {
        e.target.value = ''
        onNavigate('metric', preset)
        return
      }
      applyPreset(preset)
      if (warningSkipped) showToast('Some projector data was lost during migration.')
    } catch {
      showToast('Invalid preset file', true)
    }
    e.target.value = ''
  }

  function handleExport() {
    downloadPreset(state, `pixel-${state.grid.cols}x${state.grid.rows}.json`)
  }

  async function handleExportPng() {
    if (hasErrors) return
    await exportPng(settings, `pattern-${settings.outputWidth}x${settings.outputHeight}.png`)
  }

  const inputStyle = (errKey) => ({
    borderColor: errors[errKey] ? 'var(--danger)' : undefined,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header style={{
        background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)',
        padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onHome} style={{ color: 'var(--accent)', border: 'none', background: 'none', fontSize: 12 }}>← Home</button>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Pixel Pattern Mode</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <button onClick={() => fileRef.current.click()}>Import JSON</button>
          <button onClick={handleExport}>Export JSON</button>
          <button className="btn-primary" onClick={handleExportPng} disabled={hasErrors}>Export PNG</button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel */}
        <aside style={{
          width: 240, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)',
          padding: 12, overflowY: 'auto', flexShrink: 0,
        }}>
          {/* Grid */}
          <div className="section-title">Grid</div>
          <div className="field-row" style={{ marginBottom: 4 }}>
            <span className="field-label">Cols</span>
            <input type="number" min="1" value={state.grid.cols}
              onChange={e => setGrid('cols', Math.max(1, parseInt(e.target.value) || 1))}
              style={{ width: 50, ...inputStyle('cols') }} />
            <span className="field-label" style={{ marginLeft: 8 }}>Rows</span>
            <input type="number" min="1" value={state.grid.rows}
              onChange={e => setGrid('rows', Math.max(1, parseInt(e.target.value) || 1))}
              style={{ width: 50, ...inputStyle('rows') }} />
          </div>
          <div className="field-row" style={{ marginBottom: 4 }}>
            <span className="field-label">W</span>
            <input type="number" min="1" value={state.grid.width}
              onChange={e => setGrid('width', Number(e.target.value))}
              style={{ width: 65, ...inputStyle('width') }} />
            <span className="field-unit">×</span>
            <input type="number" min="1" value={state.grid.height}
              onChange={e => setGrid('height', Number(e.target.value))}
              style={{ width: 65, ...inputStyle('height') }} />
            <span className="field-unit">px</span>
          </div>

          {/* Blend */}
          <div className="section-title">Blend</div>
          <div className="field-row" style={{ marginBottom: 4 }}>
            <span className="field-label">Horiz.</span>
            <input type="number" min="0" value={state.grid.blendH}
              onChange={e => setGrid('blendH', Number(e.target.value))}
              style={{ width: 65, ...inputStyle('blendH') }} />
            <span className="field-unit">px</span>
          </div>
          <div className="field-row" style={{ marginBottom: 4 }}>
            <span className="field-label">Vert.</span>
            <input type="number" min="0" value={state.grid.blendV}
              onChange={e => setGrid('blendV', Number(e.target.value))}
              style={{ width: 65, ...inputStyle('blendV') }} />
            <span className="field-unit">px</span>
          </div>
          {(errors.blendH || errors.blendV) && (
            <div className="error-text">Blend must be 0 to less than cell dimension</div>
          )}

          <div className="info-box">
            Total: <strong>{settings.outputWidth} × {settings.outputHeight} px</strong>
            <div style={{ fontSize: 10, marginTop: 2 }}>
              {state.grid.cols} × {state.grid.rows} cell{state.grid.rows * state.grid.cols !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Display */}
          <div className="section-title">Display</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <input type="checkbox" checked={state.display.colorBars}
              onChange={e => setDisplay('colorBars', e.target.checked)} />
            Color bars (SMPTE 75%)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <input type="checkbox" checked={state.display.showBlendZones}
              onChange={e => setDisplay('showBlendZones', e.target.checked)} />
            Show blend zones
          </label>
          <div className="field-row" style={{ marginBottom: 4 }}>
            <span className="field-label">Grid size</span>
            <input type="number" min="1" value={state.display.gridSize}
              onChange={e => setDisplay('gridSize', Number(e.target.value))}
              style={{ width: 55, ...inputStyle('gridSize') }} />
            <span className="field-unit">px</span>
          </div>
          <div className="field-row" style={{ marginBottom: 4 }}>
            <span className="field-label">Text size</span>
            <input type="number" min="8" value={state.display.textSize}
              onChange={e => setDisplay('textSize', Number(e.target.value))}
              style={{ width: 55, ...inputStyle('textSize') }} />
            <span className="field-unit">px</span>
          </div>
          {errors.gridSize && <div className="error-text">Grid size must be ≥ 1</div>}
          {errors.textSize && <div className="error-text">Text size must be ≥ 8</div>}

          {/* Pattern */}
          <div className="section-title">Pattern</div>
          <select value={state.display.patternType} onChange={e => setDisplay('patternType', e.target.value)}
            style={{ width: '100%', marginBottom: 8, padding: '4px 6px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-primary)' }}>
            {['grid', 'dots', 'crosshatch', 'solid', 'gradient', 'reference'].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>

          {/* Reference-specific options */}
          {state.display.patternType === 'reference' && (
            <>
              <div className="section-title">Reference</div>
              <div className="field-row" style={{ marginBottom: 5 }}>
                <span className="field-label">Title</span>
                <input type="text" value={state.display.title}
                  onChange={e => setDisplay('title', e.target.value)}
                  placeholder="Pattern name…"
                  style={{ flex: 1 }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <input type="checkbox" checked={state.display.showCircles}
                  onChange={e => setDisplay('showCircles', e.target.checked)} />
                Show circles
              </label>
            </>
          )}

          {/* Colors */}
          <div className="section-title">Colors</div>
          <ColorPicker label="Background" value={state.colors.background} onChange={v => setColor('background', v)} />
          <ColorPicker label="Pattern"    value={state.colors.pattern}    onChange={v => setColor('pattern', v)} />
          <ColorPicker label="Text"       value={state.colors.text}       onChange={v => setColor('text', v)} />
          <ColorPicker label="Blend zone" value={state.colors.blendZone}  onChange={v => setColor('blendZone', v)} />
        </aside>

        <CanvasPreview settings={settings} />
      </div>

      {toast && (
        <div className={`toast ${toast.isError ? 'toast-error' : ''}`}>
          {toast.msg}
          <button onClick={() => setToast(null)} style={{ border: 'none', background: 'none', marginLeft: 8, cursor: 'pointer' }}>✕</button>
        </div>
      )}
    </div>
  )
}

function validatePixel(state) {
  const errors = {}
  if (!state.grid.cols || state.grid.cols < 1) errors.cols = true
  if (!state.grid.rows || state.grid.rows < 1) errors.rows = true
  if (!state.grid.width || state.grid.width < 1) errors.width = true
  if (!state.grid.height || state.grid.height < 1) errors.height = true
  if (state.grid.blendH < 0 || state.grid.blendH >= state.grid.width) errors.blendH = true
  if (state.grid.blendV < 0 || state.grid.blendV >= state.grid.height) errors.blendV = true
  if (!state.display.gridSize || state.display.gridSize < 1) errors.gridSize = true
  if (!state.display.textSize || state.display.textSize < 8) errors.textSize = true
  return errors
}
```

- [ ] **Step 2: Delete `ProjectorCard.jsx`**

```bash
rm src/components/ProjectorCard.jsx
```

- [ ] **Step 3: Run all tests**

```bash
npm test -- --run 2>&1 | tail -8
```

Expected: all tests pass.

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Open http://localhost:5173 → Pixel Pattern Mode. Verify:
- Left panel shows Grid (cols/rows/W/H), Blend (H/V), Display section
- No ProjectorCard list, no layout direction toggle
- Info box shows correct total dimensions
- Changing cols/rows/width/height updates canvas immediately
- Pattern dropdown includes "Reference"
- Selecting "Reference" shows Title input and Show circles checkbox
- Title text appears on canvas
- Toggling Show circles removes circles from canvas
- SMPTE color bars appear centered when enabled
- Export PNG produces correct file

- [ ] **Step 5: Commit**

```bash
git add src/components/PixelPatternMode.jsx
git rm src/components/ProjectorCard.jsx
git commit -m "feat: rewrite PixelPatternMode with grid config UI and reference pattern controls"
```

---

## Final check

- [ ] **Run full test suite**

```bash
npm test -- --run 2>&1 | tail -8
```

Expected: all tests pass.

- [ ] **Production build**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...ms` with no errors.
