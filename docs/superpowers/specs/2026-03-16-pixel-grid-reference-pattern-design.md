# Pixel Grid Layout & Reference Pattern Design

**Date:** 2026-03-16
**Status:** Approved

---

## Goal

Replace the linear projector list in Pixel Pattern Mode with a uniform rows×columns grid model, add a "reference" pattern type matching professional test pattern generators (circles, edge labels, crosshair, title), move SMPTE color bars to center-canvas, and add text size control.

## Architecture

A uniform grid replaces the flat projector array. All cells share one resolution and one pair of blend values (horizontal/vertical). A new `calcGridTotal` / `calcGridPositions` function pair replaces the old `calcPixelTotal` / `calcProjectorPositions`. `drawPixelPattern` gains a reference-pattern rendering path. The left panel UI is simplified to a compact grid config form.

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
    patternType: 'grid',     // 'grid'|'dots'|'crosshatch'|'solid'|'gradient'|'reference'
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
```

### Derived settings (via `useMemo`)

```js
settings = {
  ...state,
  outputWidth,    // from calcGridTotal
  outputHeight,   // from calcGridTotal
  positions,      // from calcGridPositions — Array<{ x, y, col, row }>
}
```

### Preset migration

Old presets that contain a `projectors` array are auto-migrated on load:
- `grid.cols = projectors.length`, `grid.rows = 1`
- `grid.width = projectors[0].width`, `grid.height = projectors[0].height`
- `grid.blendH = projectors[0].blend.right`, `grid.blendV = projectors[0].blend.bottom`

---

## Calculations (`src/utils/calculations.js`)

### `calcGridTotal(grid)`

```js
totalWidth  = grid.cols * grid.width  - (grid.cols - 1) * grid.blendH
totalHeight = grid.rows * grid.height - (grid.rows - 1) * grid.blendV
```

### `calcGridPositions(grid)`

Returns an array of `{ x, y, col, row }` for each cell (row-major order):

```js
for row 0..rows-1:
  for col 0..cols-1:
    x = col * (grid.width  - grid.blendH)
    y = row * (grid.height - grid.blendV)
    push { x, y, col, row }
```

Both functions validate: rows/cols ≥ 1, width/height ≥ 1, blendH < width, blendV < height.

Old functions (`calcPixelTotal`, `calcProjectorPositions`) are removed.

---

## Drawing (`src/utils/draw/drawPixelPattern.js`)

`settings` passed to `drawPixelPattern` now uses `grid` + `positions` instead of `projectors`.

### Color bars — moved to vertical center

When `display.colorBars` is true (any pattern type):
- Strip height = `max(40, outputHeight * 0.1)`
- Strip top = `(outputHeight - stripHeight) / 2`  ← centered
- 7 SMPTE bars drawn full-width within the strip

### Reference pattern type

Rendered in this layer order:

1. **Background** — `colors.background` fill
2. **Grid lines** — same algorithm as the existing `grid` type, interval = `display.gridSize`
3. **Inscribed circles** — one per cell; radius = `min(cellW, cellH) / 2 - 10`; centered at cell center; stroke only; color = `colors.pattern`. Only drawn when `display.showCircles = true`.
4. **Center crosshair** — single horizontal line at `outputHeight / 2` and vertical line at `outputWidth / 2`; color = `colors.pattern`; lineWidth = 2
5. **Edge labels**:
   - Column numbers: `1, 2, 3…cols` drawn at top and bottom of each column, horizontally centered in the column's x-range
   - Row letters: `A, B, C…` drawn at left and right of each row, vertically centered in the row's y-range
   - Font size = `display.textSize`; color = `colors.text`
6. **Title text** — `display.title` (if non-empty); large font (`textSize * 3`); centered in canvas (horizontal + vertical center)
7. **Info text** — below title; `textSize * 1.2`; content: `WxH px · ratio · cols×rows cells`
8. **SMPTE color bars** — only when `display.colorBars = true`; drawn centered as described above
9. **Blend zone overlays** — when `display.showBlendZones = true`; `globalAlpha = 0.3`; drawn per cell using positions

### All other pattern types

Behavior unchanged except color bars now render at vertical center instead of top.

---

## UI (`src/components/PixelPatternMode.jsx`)

The ProjectorCard list is replaced with a compact grid config panel:

```
Grid
  Cols [2↕]    Rows [1↕]
  Width [1920]  Height [1080] px

Blend
  Horizontal [0] px
  Vertical   [0] px

→ Total: 3840 × 1080 px  (2 × 1 projectors)

Display
  □ Color bars    □ Show blend zones
  Grid size [100] px    Text size [14] px

Pattern  [grid ▾]

Reference  ← shown only when patternType = 'reference'
  Title [_________________________]
  □ Show circles

Colors
  Background / Pattern / Text / Blend zone
```

Validation:
- `cols` and `rows` ≥ 1
- `width` and `height` ≥ 1
- `blendH` ≥ 0 and < `width`
- `blendV` ≥ 0 and < `height`
- `gridSize` ≥ 1
- `textSize` ≥ 6

`ProjectorCard` component is kept in the codebase but no longer used.

---

## Files Changed

| File | Change |
|------|--------|
| `src/utils/calculations.js` | Add `calcGridTotal`, `calcGridPositions`; remove old pixel functions |
| `tests/utils/calculations.test.js` | Add tests for new grid functions |
| `src/hooks/usePixelState.js` | New state shape; use `calcGridTotal`/`calcGridPositions` |
| `tests/hooks/usePixelState.test.js` | Update tests for new shape |
| `src/utils/draw/drawPixelPattern.js` | Reference pattern; color bars centering |
| `src/utils/presets.js` | Auto-migrate old `projectors`-array presets |
| `src/components/PixelPatternMode.jsx` | New grid config UI; reference pattern controls |

---

## Testing

- Unit tests for `calcGridTotal` and `calcGridPositions` (edge cases: 1×1, 3×2, blendH=0, blendH>0)
- Unit tests for `usePixelState`: initializes with defaults, updates grid fields, derived outputWidth/outputHeight correct
- Unit tests for preset migration: old `projectors` array → new grid shape
- Drawing functions are not unit tested (canvas); verified visually via the dev server
