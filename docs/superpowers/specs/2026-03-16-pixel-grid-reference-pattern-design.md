# Pixel Grid Layout & Reference Pattern Design

**Date:** 2026-03-16
**Status:** Approved

---

## Goal

Replace the linear projector list in Pixel Pattern Mode with a uniform rows×columns grid model, add a "reference" pattern type matching professional test pattern generators (circles, edge labels, crosshair, title), move SMPTE color bars to a centered overlay, and add text size control.

## Architecture

A uniform grid replaces the flat projector array. All cells share one resolution and one pair of blend values (horizontal/vertical). `display.layoutDirection` is removed — `grid.rows` and `grid.cols` replace it. Two new calculation functions replace the old pixel layout functions. `drawPixelPattern` gains a reference-pattern rendering path. The left panel UI is simplified to a compact grid config form.

A standalone `migratePixelPreset(raw)` helper is extracted into `presets.js` and called in **both** `readPresetFile` and `loadLastPreset`, so localStorage-persisted old presets are also migrated.

**Tech Stack:** React, HTML5 Canvas, Vitest

---

## State Model

### `usePixelState` — new shape

```js
{
  mode: 'pixel',
  grid: {
    rows: 1,
    cols: 2,
    width: 1920,
    height: 1080,
    blendH: 0,   // horizontal overlap between columns (px)
    blendV: 0,   // vertical overlap between rows (px)
  },
  display: {
    colorBars: false,
    showBlendZones: true,
    gridSize: 100,
    textSize: 14,
    patternType: 'grid',  // 'grid'|'dots'|'crosshatch'|'solid'|'gradient'|'reference'
    showCircles: true,    // only evaluated when patternType === 'reference'
    title: '',            // only rendered when patternType === 'reference'
  },
  colors: {
    background: '#000000',
    pattern: '#ffffff',
    text: '#ffffff',
    blendZone: '#6366f1',
  },
}
```

`showCircles` and `title` persist in state when switching pattern types so settings are not lost. They have no effect on rendering unless `patternType === 'reference'`.

`display.layoutDirection` is removed entirely.

### Derived settings (via `useMemo`)

```js
settings = {
  ...state,
  outputWidth,    // from calcGridTotal
  outputHeight,   // from calcGridTotal
  positions,      // from calcGridPositions — Array<{ x, y, col, row }>
}
```

### Hook public API

```js
{
  state, settings,
  setGrid(key, value),      // setState for state.grid[key]
  setDisplay(key, value),   // setState for state.display[key]
  setColor(key, value),     // setState for state.colors[key]
  applyPreset(preset),      // replaces full state: { ...DEFAULTS, ...preset }
}
```

Per-projector functions (`addProjector`, `removeProjector`, `updateProjector`, `updateProjectorBlend`) are removed. `applyPreset` uses `{ ...DEFAULTS, ...preset }` (shallow merge). `validatePreset` must have filled all optional fields before `applyPreset` is called — this is guaranteed in the file-import path and migration path; see preset section below.

### Preset migration

A standalone `migratePixelPreset(raw)` function is added to `presets.js`. It is called:
1. Inside `readPresetFile` — after JSON parse, before `validatePreset`
2. Inside `loadLastPreset` — after `JSON.parse`, before returning

`migratePixelPreset(raw)` returns the raw object unchanged if `raw.mode !== 'pixel'` or if `raw.grid` already exists (new format). For old format (has `projectors` array):

```js
const p0 = projectors[0]
const nonUniform = projectors.some(p => p.width !== p0.width || p.height !== p0.height)
// nonUniform → warningSkipped flag passed back to caller
return {
  ...raw,
  grid: {
    rows: 1,
    cols: projectors.length,
    width: p0.width,
    height: p0.height,
    blendH: p0.blend.right,  // first projector's right overlap; others discarded
    blendV: 0,                // explicitly 0; old horizontal presets never used vertical blend
  },
  // projectors array dropped; layoutDirection dropped
}
```

`warningSkipped` is set to `true` when projectors had non-uniform widths or heights (data loss occurred).

### `validatePreset` — updated pixel schema

For `mode === 'pixel'`, a valid preset requires a `grid` object (not a `projectors` array). Fields and rules:

```
grid.rows    — integer ≥ 1
grid.cols    — integer ≥ 1
grid.width   — number ≥ 1
grid.height  — number ≥ 1
grid.blendH  — number ≥ 0 and < grid.width
grid.blendV  — number ≥ 0 and < grid.height

display.patternType — one of ['grid','dots','crosshatch','solid','gradient','reference']
display.gridSize    — number ≥ 1
display.textSize    — number ≥ 8
```

Missing optional fields that are filled from DEFAULTS if absent:
`colorBars`, `showBlendZones`, `showCircles`, `title`, `gridSize`, `textSize`

Invalid required fields cause `{ valid: false, error }`. Optional fields out of range are clamped, not rejected.

---

## Calculations (`src/utils/calculations.js`)

**Retain `metersToPixels` — do not remove it.** Only remove `calcPixelTotal` and `calcProjectorPositions`.

### `calcGridTotal(grid)`

```js
totalWidth  = grid.cols * grid.width  - (grid.cols - 1) * grid.blendH
totalHeight = grid.rows * grid.height - (grid.rows - 1) * grid.blendV
```

### `calcGridPositions(grid)`

Returns a flat row-major array of `{ x, y, col, row }` for each cell. All cells including the last column/row use the same formula (intentional, differs from old model which skipped the last projector's blend):

```js
for (let row = 0; row < grid.rows; row++) {
  for (let col = 0; col < grid.cols; col++) {
    x = col * (grid.width  - grid.blendH)
    y = row * (grid.height - grid.blendV)
    positions.push({ x, y, col, row })
  }
}
```

The loop variables `col` and `row` are **0-indexed**. Displayed labels are derived separately (`col+1` for column numbers, `String.fromCharCode(65+row)` for row letters).

Cell dimensions are always `grid.width` × `grid.height`. The draw layer reads these from `settings.grid.width` / `settings.grid.height` directly.

Both functions assume valid input. They do not throw — callers must validate before calling.

---

## Drawing (`src/utils/draw/drawPixelPattern.js`)

`settings` now contains `grid` and `positions`. `cellW = settings.grid.width`, `cellH = settings.grid.height`.

### Color bars — centered overlay (all pattern types)

**This replaces the old top-anchored behavior** where bars were at `y=0` and displaced the pattern. Now, for all pattern types when `display.colorBars` is true, bars are drawn **on top of the full-canvas pattern**:

- `barHeight = Math.max(40, Math.round(outputHeight * 0.1))`
- `barY = Math.round((outputHeight - barHeight) / 2)`
- 7 SMPTE bars full-width at `(Math.round(i * outputWidth/7), barY, Math.round(outputWidth/7), barHeight)`

### Non-reference pattern types

For all non-reference pattern types (`grid`, `dots`, `crosshatch`, `solid`, `gradient`):
1. Background fill
2. Pattern across full canvas (existing algorithms unchanged)
3. SMPTE color bars overlay (if `colorBars=true`, centered as above)
4. Blend zone overlays (if `showBlendZones=true`, per-cell, `globalAlpha=0.3`)
5. **Cell boundary rectangles** — dashed stroke per cell (`setLineDash([6,4])`; `strokeStyle=colors.pattern`; `lineWidth=1`)
6. **Cell labels** — top-left of each cell: `"${col+1},${row+1}"` (or `P${i+1}` style); `font=max(10,round(cellH*0.02))px monospace`
7. **Total dimensions label** — bottom-left corner: `"${outputWidth}×${outputHeight}px total"`

### Reference pattern type

1. **Background** — `colors.background` fill
2. **Grid lines** — same algorithm as `grid` type, interval = `display.gridSize`; `strokeStyle=colors.pattern`
3. **Inscribed circles** — when `display.showCircles === true`:
   - `radius = Math.floor(Math.min(cellW, cellH) / 2) - 10`
   - Skip if `radius <= 0`
   - One circle per cell, centered at `(x + cellW/2, y + cellH/2)`
   - `strokeStyle = colors.pattern`; `lineWidth = 1`; stroke only (no fill)
4. **Center crosshair** — `strokeStyle = colors.pattern`; `lineWidth = 2`:
   - Horizontal line at `y = outputHeight/2`, full width
   - Vertical line at `x = outputWidth/2`, full height
5. **Edge labels** — `fillStyle = colors.text`:
   - **Column labels** (loop `col` from `0` to `cols-1`):
     - Label text = `String(col + 1)`
     - `x = col * (cellW - blendH) + cellW / 2`
     - Top: `textAlign='center'`, `textBaseline='top'`, `y = 4`
     - Bottom: `textAlign='center'`, `textBaseline='bottom'`, `y = outputHeight - 4`
     - Omit all column labels when `cellW < 2 * textSize`
   - **Row labels** (loop `row` from `0` to `rows-1`):
     - Label text = `String.fromCharCode(65 + row)` (A, B, C…)
     - `y = row * (cellH - blendV) + cellH / 2`
     - Left: `textAlign='left'`, `textBaseline='middle'`, `x = 4`
     - Right: `textAlign='right'`, `textBaseline='middle'`, `x = outputWidth - 4`
     - When `rows > 26`: **all row labels are omitted** (not just rows beyond 26)
   - Font = `display.textSize + 'px monospace'`
6. **Title text** — when `display.title` is non-empty:
   - `font = Math.round(textSize * 3) + 'px monospace'`
   - `textAlign='center'`, `textBaseline='middle'`
   - Position: `(outputWidth/2, outputHeight/2)`
   - `fillStyle = colors.text`
7. **Info text** — below title:
   - `y = outputHeight/2 + Math.round(textSize * 3 / 2) + 8`
   - `font = Math.round(textSize * 1.2) + 'px monospace'`
   - `textAlign='center'`, `textBaseline='top'`
   - Content: `"${outputWidth}×${outputHeight}px  ·  ${ratio}:1  ·  ${cols}×${rows} cells"` where `ratio = (outputWidth / outputHeight).toFixed(2)`
   - `fillStyle = colors.text`
8. **SMPTE color bars** — if `display.colorBars === true`, centered overlay (same as other patterns)
9. **Blend zone overlays** — if `display.showBlendZones === true`; `globalAlpha = 0.3`; `fillStyle = colors.blendZone`; per-cell blend edges

---

## UI (`src/components/PixelPatternMode.jsx`)

The layout direction toggle and ProjectorCard list are removed. The left panel:

```
Grid
  Cols [2↕]    Rows [1↕]
  Width [1920]  Height [1080] px

Blend
  Horizontal [0] px   ← between columns (blendH)
  Vertical   [0] px   ← between rows (blendV)

→ Total: 3840 × 1080 px  (2 × 1 cells)

Display
  □ Color bars    □ Show blend zones
  Grid size [100] px    Text size [14] px

Pattern  [grid / dots / crosshatch / solid / gradient / reference ▾]

Reference  ← section shown only when patternType = 'reference'
  Title [_________________________]
  □ Show circles

Colors
  Background / Pattern / Text / Blend zone
```

**Validation** (UI-only / inline; `Export PNG` disabled while errors present; draw functions receive whatever value is in state):
- `cols` ≥ 1, `rows` ≥ 1
- `width` ≥ 1, `height` ≥ 1
- `blendH` ≥ 0 and < `width`
- `blendV` ≥ 0 and < `height`
- `gridSize` ≥ 1
- `textSize` ≥ 8

---

## Files Changed

| File | Change |
|------|--------|
| `src/utils/calculations.js` | Add `calcGridTotal`, `calcGridPositions`; remove `calcPixelTotal`, `calcProjectorPositions`; retain `metersToPixels` |
| `tests/utils/calculations.test.js` | Replace pixel total/position tests with grid tests |
| `src/hooks/usePixelState.js` | New state shape; new public API (`setGrid`); remove per-projector functions; remove `layoutDirection` |
| `tests/hooks/usePixelState.test.js` | Update for new state shape and API |
| `src/utils/draw/drawPixelPattern.js` | Reference pattern rendering; centered color bars overlay; use `grid`+`positions` |
| `src/utils/presets.js` | Add `migratePixelPreset`; call it in `readPresetFile` and `loadLastPreset`; update `validatePreset` pixel schema |
| `tests/utils/presets.test.js` | Update pixel preset tests for new schema; add migration tests |
| `src/components/PixelPatternMode.jsx` | Grid config UI; remove ProjectorCard usage; `'reference'` in dropdown; reference section |
| `src/components/ProjectorCard.jsx` | **Delete** — no longer referenced |

---

## Testing

- `calcGridTotal`: 1×1 no blend → 1920×1080; 3×1 blendH=40 → correct width; 2×2 both blends → correct total
- `calcGridPositions`: 1×1 → `[{x:0,y:0,col:0,row:0}]`; 2×1 blendH=40 → `[{x:0},{x:1880}]`; 2×2 blendH=40,blendV=20 → all 4 cells at correct positions
- `usePixelState`: initializes with defaults; `setGrid('cols',3)` updates derived `outputWidth`; `applyPreset` replaces state correctly
- `migratePixelPreset`: single-projector → correct grid; multi-projector → cols=N,rows=1; blendV always 0; non-uniform sizes sets `warningSkipped`; new-format preset passes through unchanged
- `validatePreset`: new pixel schema accepts valid preset; rejects missing `grid`; rejects `blendH ≥ width`; fills missing optional fields from DEFAULTS
- Drawing: verified visually via dev server (canvas not unit tested)
