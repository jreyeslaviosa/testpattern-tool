# Projection Test Pattern Generator — Design Spec

**Date:** 2026-03-15
**Status:** Approved

---

## Overview

A static web app for generating projection test patterns, shared internally within an organization. No backend, no authentication — just a hosted static site anyone on the team can open in their browser. Built with Vite + React, deployed as a `dist/` folder on any web server.

Inspired by vioso.com/tools/testpattern-generator. Two independent modes: **Metric Mode** (real-world wall dimensions → pixel grid) and **Pixel Pattern Mode** (multi-projector resolution + blending).

---

## Delivery

- **Type:** Static web app (Vite + React)
- **Hosting:** Internal web server (drop `dist/` folder, serve with nginx/Apache/any static host)
- **No backend required**
- **Build requirement:** Node.js (build time only, not runtime)
- **Theme:** Minimal, readable UI with dark/light toggle. Muted accent colors (indigo/slate). No neon. Theme preference persisted in `localStorage` under key `theme`.

---

## App Structure

### Screen 1 — Home / Mode Selector

Landing page with two mode cards:

- **Metric Mode** — "Real-world wall dimensions → pixel grid"
- **Pixel Pattern Mode** — "Multi-projector setup, blending, alignment grid"

The home screen shows the last-used preset as a quick-load shortcut. The **full preset JSON** (not just the filename) is persisted in `localStorage` under key `lastPreset`. The shortcut label shows the filename. Clicking "Load →" applies the preset and navigates to the appropriate mode. If `localStorage` contains no `lastPreset` entry, the shortcut is hidden.

---

### Screen 2 — Metric Mode

**Purpose:** Calculate pixel dimensions from real-world wall measurements, render a calibration grid with meter subdivisions.

**Default state on first load:**

| Field | Default |
|---|---|
| Wall Width | 8.0 m |
| Wall Height | 4.5 m |
| DPI | 96 |
| Grid subdivision | 1.0 m |
| Lock W / Lock H | both false |
| Pattern type | Grid |
| Background | #ffffff |
| Pattern color | #374151 |
| Text color | #374151 |
| Border color | #111111 |

**Left panel controls:**

| Control | Description |
|---|---|
| Wall Width | Numeric input in meters. Has an independent lock button (🔒/🔓). |
| Wall Height | Numeric input in meters. Has an independent lock button (🔒/🔓). |
| DPI | Pixels per inch (default 96). Used to calculate pixel output. |
| Pixel output display | Read-only derived display showing W × H in pixels. Updates live. |
| Grid subdivision | Meters per grid cell. Numeric input, default 1.0 m. |
| Pattern type | Dropdown: Grid, Dots, Crosshatch, Solid, Gradient (see Pattern Types section). |
| Background color | Color picker |
| Grid / pattern color | Color picker |
| Text color | Color picker |
| Border color | Color picker |

**Pixel calculation formula:**
```
pixels = (dimension_meters / 0.0254) * DPI
```

**Lock behavior — two independent booleans (`lockW`, `lockH`):**

| lockW | lockH | Behavior |
|---|---|---|
| false | false | Both dimensions compute freely from meters + DPI |
| true | false | Width is frozen. Changing wall width meters has no effect on pixel W. Changing DPI recalculates only height. |
| false | true | Height is frozen. Changing wall height meters has no effect on pixel H. Changing DPI recalculates only width. |
| true | true | Both pixel dimensions are frozen. No input changes the pixel output. Meters and DPI fields remain editable for reference but do not affect pixel output. |

The pixel output display is always read-only. Locking does not make it editable. "Lock W" means: snapshot the current calculated pixel width at the instant the lock toggle is clicked ON, and stop recalculating it until the lock is released. If the lock is released and then re-engaged, the new current value is snapshotted again — there is no memory of any prior locked value.

**Lock when state is invalid:** If the wall width/height field has a validation error (empty, zero, negative) at the moment the lock is clicked, the lock toggle is ignored (the lock does not engage) and the button visually stays unlocked. The user must fix the input before locking.

**Input validation — Metric Mode:**

| Field | Constraint | Error behavior |
|---|---|---|
| Wall Width | > 0 | Show inline red message "Must be greater than 0". Disable Export PNG. |
| Wall Height | > 0 | Show inline red message "Must be greater than 0". Disable Export PNG. |
| DPI | ≥ 1 | Show inline red message "Must be at least 1". Disable Export PNG. |
| Grid subdivision | > 0 and ≤ min(width, height) | Show inline red message "Must be between 0 and the smaller wall dimension". Disable Export PNG. |

**Canvas output:**
- Grid lines (or selected pattern) at every subdivision interval
- Crosshair (+) and registration marks at all four corners and center
- Dimension label at bottom-left (e.g. `8.0m × 4.5m · 1m/grid · 3024×1701px`)
- All colors user-configurable

**Header actions:** Import JSON, Export JSON, Export PNG

---

### Screen 3 — Pixel Pattern Mode

**Purpose:** Generate a composite test pattern for a multi-projector setup, showing each projector's canvas region, blend zones, and alignment grid.

**Layout direction** is user-selectable: **Horizontal** (projectors side-by-side in a single row) or **Vertical** (projectors stacked in a single column). Grid arrangements (2×2, 3×2, etc.) are out of scope.

**Default state on first load:**

| Field | Default |
|---|---|
| Layout direction | Horizontal |
| Projector count | 1 |
| Projector label | "Projector 1" |
| Resolution | 1920 × 1080 |
| All blend values | 0 |
| Color bars | false |
| Show blend zones | true |
| Grid size | 100 px |
| Pattern type | Grid |
| Background | #ffffff |
| Pattern color | #374151 |
| Text color | #374151 |
| Blend zone color | #6366f1 |

**Left panel — Projector list:**

Dynamic list of projectors (1 to 10+). Each projector card contains:

| Field | Description |
|---|---|
| Label | Auto-named "Projector 1", "Projector 2", etc. Editable inline. |
| Resolution | Width × Height in pixels (e.g. 1920×1080). Two numeric inputs. |
| Blend Left | Pixels of blend overlap on the left edge of this projector |
| Blend Right | Pixels of blend overlap on the right edge of this projector |
| Blend Top | Pixels of blend overlap on the top edge of this projector |
| Blend Bottom | Pixels of blend overlap on the bottom edge of this projector |

**Blend values are independent per projector and edge.** Adjacent projectors do not need matching values — the app treats each value as-entered. A shared physical blend region may have different values on the two sides; this is intentional (the user may configure asymmetric blends).

**Total canvas size formulas:**

*Horizontal layout:*
```
total_width  = sum(p.width for each projector p)
               - sum(p.blend_right for p in projectors[0..N-2])
total_height = max(p.height for each projector p)
```
Only `blend_right` of each non-last projector is subtracted (each overlap region is counted once).

*Vertical layout:*
```
total_width  = max(p.width for each projector p)
total_height = sum(p.height for each projector p)
               - sum(p.blend_bottom for p in projectors[0..N-2])
```
Only `blend_bottom` of each non-last projector is subtracted.

**Projector position in the composite canvas:**

*Horizontal layout:*
```
x[0] = 0
x[N] = x[N-1] + projectors[N-1].width - projectors[N-1].blend_right
y[N] = 0  (all projectors share y=0)
```

*Vertical layout:*
```
y[0] = 0
y[N] = y[N-1] + projectors[N-1].height - projectors[N-1].blend_bottom
x[N] = 0  (all projectors share x=0)
```

Each projector's region starts at `(x[N], y[N])` and extends `projectors[N].width × projectors[N].height` pixels. Blend overlays from adjacent projectors may visually overlap in the physical seam area — this is intentional.

**Export resolution:** The PNG is rendered at `total_width × total_height` as calculated above.

**Input validation — Pixel Pattern Mode:**

| Field | Constraint | Error behavior |
|---|---|---|
| Projector width | ≥ 1 | Inline red message. Disable Export PNG. |
| Projector height | ≥ 1 | Inline red message. Disable Export PNG. |
| Blend Left / Blend Right | ≥ 0 and < projector width | Inline red message. Disable Export PNG. |
| Blend Top / Blend Bottom | ≥ 0 and < projector height | Inline red message. Disable Export PNG. |
| Projector count | ≥ 1 | Always satisfied (UI prevents removing the last projector). |

**Left panel — Display options:**

| Option | Description |
|---|---|
| Layout direction | Toggle: Horizontal / Vertical. Changes projector arrangement and canvas size formula. |
| Color bars | Toggle SMPTE 75% color bars (see Color Bars section below) |
| Show blend zones | Overlay semi-transparent highlight on blend regions |
| Grid size | Pixel size of alignment grid cells (default 100 px). Numeric input. Must be ≥ 1. |
| Pattern type | Dropdown: Grid, Dots, Crosshatch, Solid, Gradient (see Pattern Types section). |
| Grid / pattern color | Color picker |
| Text color | Color picker |
| Background color | Color picker |
| Blend zone color | Color picker |

**Canvas output:**
- Projectors rendered side-by-side (horizontal) or stacked (vertical) based on layout direction
- Grid / selected pattern across the full composite canvas
- Blend zone overlays drawn as semi-transparent rectangles using the blend zone color at 30% opacity:
  - Left edge overlay: `x = projector_x`, `y = 0`, `w = blend_left`, `h = total_height`
  - Right edge overlay: `x = projector_x + projector_width - blend_right`, `y = 0`, `w = blend_right`, `h = total_height`
  - Top edge overlay: `x = projector_x`, `y = 0`, `w = projector_width`, `h = blend_top`
  - Bottom edge overlay: `x = projector_x`, `y = total_height - blend_bottom`, `w = projector_width`, `h = blend_bottom`
  - Overlays with a value of 0 are skipped (not drawn)
- Projector labels (P1, P2…) at top-left of each region
- Total canvas dimensions shown at bottom-left
- Optional SMPTE 75% color bars at top

**Header actions:** Import JSON, Export JSON, Export PNG

---

## Color Bars (SMPTE 75%)

When color bars are enabled, they are rendered as a horizontal band at the top of the canvas, **10% of the canvas height** tall (minimum 40px).

Bar order left-to-right (SMPTE 75% standard, 7 equal-width bars):

| Bar | Color | Hex |
|---|---|---|
| 1 | White 75% | `#c0c0c0` |
| 2 | Yellow 75% | `#c0c000` |
| 3 | Cyan 75% | `#00c0c0` |
| 4 | Green 75% | `#00c000` |
| 5 | Magenta 75% | `#c000c0` |
| 6 | Red 75% | `#c00000` |
| 7 | Blue 75% | `#0000c0` |

The 7 bars are distributed evenly across the full composite canvas width: each bar width = `total_width / 7`. The grid/pattern is drawn below the color bars region, starting at `y = color_bar_height`. Grid line y-coordinates are calculated relative to `y = color_bar_height` (i.e., the first horizontal grid line is at `y = color_bar_height + gridInterval`).

---

## Pattern Types

Both modes support the same pattern type options. The selected pattern is drawn using the "Grid / pattern color" and fills the canvas area (excluding color bars if enabled).

| Type | Description |
|---|---|
| **Grid** | Horizontal and vertical lines at every subdivision interval (Metric) or every `gridSize` pixels (Pixel). Default. |
| **Dots** | A dot (filled circle, radius = 3px) drawn at every grid intersection point. |
| **Crosshatch** | Diagonal lines at 45° and 135° at the same interval as the grid. |
| **Solid** | Canvas filled with the background color only. No pattern drawn. Useful as a blank reference. |
| **Gradient** | Fill canvas with background color. Then draw a horizontal linear gradient from pattern color (left, opacity 1.0) to transparent (right) using `source-over`. Then draw a vertical linear gradient from pattern color (top, opacity 0.5) to transparent (bottom) using `source-over`. Result: top-left corner shows full pattern color, fading toward bottom-right. Works correctly on both light and dark backgrounds. |

---

## Preset System (JSON Import/Export)

Settings are exported as a JSON file and can be re-imported. The full preset JSON is also persisted in `localStorage` under `lastPreset` whenever the user clicks **Export JSON** — not on every settings change. Live edits that are not exported will not be reflected in the home screen shortcut. This is intentional: export = explicit save.

**Import error handling:** If a file fails to parse as JSON, or is missing required top-level fields (`mode` and either `wall` or `projectors`), show a dismissible error toast "Invalid preset file" and do not apply any changes. Unknown extra fields are silently ignored.

**Cross-mode import:** If the user imports a preset with a `mode` value different from the current screen, the app automatically navigates to the correct mode and applies the preset.

**Projector array validation on import:** If `projectors` is present but is an empty array, treat it as invalid and show the error toast. If individual projector objects are present but missing required fields (`width`, `height`), skip those entries and show a warning toast "Some projectors had invalid data and were skipped." At least one valid projector must remain after filtering; if none remain, treat as invalid and show the error toast.

No server, no database.

**Metric preset shape:**
```json
{
  "mode": "metric",
  "wall": { "width": 8.0, "height": 4.5 },
  "dpi": 96,
  "lock": {
    "width": false,
    "height": false,
    "pixelWidth": null,
    "pixelHeight": null
  },
  "gridSubdivision": 1.0,
  "patternType": "grid",
  "colors": {
    "background": "#ffffff",
    "pattern": "#374151",
    "text": "#374151",
    "border": "#111111"
  }
}
```

`lock.pixelWidth` and `lock.pixelHeight` store the snapshotted pixel values when the respective lock is active. When `lock.width` is `true`, `lock.pixelWidth` must be a positive integer — this is the frozen pixel width displayed and used for export. When `lock.width` is `false`, `lock.pixelWidth` is `null` and is ignored.
```

**Pixel pattern preset shape:**
```json
{
  "mode": "pixel",
  "projectors": [
    {
      "label": "Projector 1",
      "width": 1920,
      "height": 1080,
      "blend": { "left": 0, "right": 40, "top": 0, "bottom": 0 }
    }
  ],
  "display": {
    "layoutDirection": "horizontal",
    "colorBars": true,
    "showBlendZones": true,
    "gridSize": 100,
    "patternType": "grid"
  },
  "colors": {
    "background": "#ffffff",
    "pattern": "#374151",
    "text": "#374151",
    "blendZone": "#6366f1"
  }
}
```

---

## Canvas Rendering

HTML5 Canvas API. Each mode has its own draw function (`drawMetric`, `drawPixelPattern`) imported into a shared `useCanvas(canvasRef, settings)` hook.

**`useCanvas` hook interface:**
```js
// canvasRef: React ref to a <canvas> element
// settings: the full current state object for the active mode
// Returns nothing. Redraws the canvas as a side effect when settings change.
useCanvas(canvasRef, settings)
```

Before calling the draw function, `useCanvas` sets `canvas.width` and `canvas.height` to the calculated output resolution (from `settings`). `CanvasPreview` wraps the `<canvas>` in a `div` container that fills all remaining horizontal and vertical space (`flex: 1`, `overflow: hidden`). The `<canvas>` element inside uses `max-width: 100%; max-height: 100%; object-fit: contain` to scale down to fit the container while preserving aspect ratio. A `ResizeObserver` on the container triggers a redraw when the container resizes.

Internally, `useCanvas` checks `settings.mode` and calls either `drawMetric(ctx, settings)` or `drawPixelPattern(ctx, settings)`.

**Export flow:**
1. Create an offscreen `OffscreenCanvas` at full output resolution
2. Call the appropriate draw function with the offscreen context
3. Call `canvas.convertToBlob()` → trigger browser file download as `pattern.png`

---

## File Structure

```
src/
  components/
    Home.jsx                  mode selector + last-preset shortcut
    MetricMode.jsx            left panel + canvas for metric mode
    PixelPatternMode.jsx      left panel + canvas for pixel pattern mode
    CanvasPreview.jsx         shared <canvas> element + ResizeObserver for display scaling
    ColorPicker.jsx           reusable color swatch + hex input
    ProjectorCard.jsx         single projector config row (label, res, blend inputs)
    ThemeToggle.jsx           dark/light mode switch (persists to localStorage)
  hooks/
    useMetricState.js         metric mode state + derived pixel dimensions
    usePixelState.js          pixel pattern state + total canvas size calculation
    useCanvas.js              calls drawMetric or drawPixelPattern on settings change
  utils/
    calculations.js           pixel-from-meters formula, blend math, total canvas size
    exportPng.js              offscreen canvas render + file download
    presets.js                JSON serialize/deserialize, localStorage read/write
    draw/
      drawMetric.js           renders metric grid/pattern to a canvas context
      drawPixelPattern.js     renders multi-projector pattern to a canvas context
  App.jsx                     top-level view state (home | metric | pixel), no router lib
  main.jsx
  index.css                   CSS custom properties for light/dark theme tokens
```

---

## Suggested Extra Features

| Feature | Mode | Description |
|---|---|---|
| Crosshair / registration marks | Both | Corner markers + center cross drawn on canvas |
| Circle / concentric rings pattern | Both | Alternative pattern type for lens focus testing — concentric circles centered on canvas |
| Ruler / scale bar | Metric | Scale reference bar drawn at bottom of canvas showing e.g. "1 m" |
| Projector label overlay | Pixel | "P1", "P2" etc. labels rendered on the exported PNG |

---

## Out of Scope

- User accounts or server-side storage
- PDF export
- Real-time collaboration
- Undo/redo history
- Mobile layout (desktop-first)
- Grid projector arrangements (2×2, 3×2, etc.) — single row or column only
