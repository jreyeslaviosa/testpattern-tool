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
- **Theme:** Minimal, readable UI with dark/light toggle. Muted accent colors (indigo/slate). No neon.

---

## App Structure

### Screen 1 — Home / Mode Selector

Landing page with two mode cards:

- **Metric Mode** — "Real-world wall dimensions → pixel grid"
- **Pixel Pattern Mode** — "Multi-projector setup, blending, alignment grid"

Also shows last-used preset filename with a quick-load shortcut (stored in `localStorage`).

---

### Screen 2 — Metric Mode

**Purpose:** Calculate pixel dimensions from real-world wall measurements, render a calibration grid with meter subdivisions.

**Left panel controls:**

| Control | Description |
|---|---|
| Wall Width | Numeric input in meters. Lock button (🔒) freezes this value when adjusting height. |
| Wall Height | Numeric input in meters. Independent lock button. |
| DPI | Pixels per inch (default 96). Used to calculate pixel output. |
| Pixel output display | Read-only: shows calculated W × H in pixels. Updates live. Highlights which dimension is locked. |
| Grid subdivision | Meters per grid cell (e.g. 1.0 m, 0.5 m, 0.25 m). Dropdown or numeric input. |
| Background color | Color picker |
| Grid color | Color picker |
| Text color | Color picker |
| Border color | Color picker |

**Pixel calculation formula:**
```
pixels = (dimension_meters / 0.0254) * DPI
```

**Lock behavior:**
- Lock W: fixing width in pixels; height adjusts freely
- Lock H: fixing height in pixels; width adjusts freely
- Lock both: aspect ratio is maintained; scaling either dimension scales the other proportionally

**Canvas output:**
- Grid lines at every subdivision interval
- Crosshair (+) at center
- Corner registration marks
- Dimension label at bottom-left (e.g. `8.0m × 4.5m · 1m/grid · 3024×1701px`)
- All colors user-configurable

**Header actions:** Import JSON, Export JSON, Export PNG

---

### Screen 3 — Pixel Pattern Mode

**Purpose:** Generate a composite test pattern for multi-projector setups, showing each projector's canvas region, blend zones, and alignment grid.

**Left panel — Projector list:**

Dynamic list of projectors (1 to 10+). Each projector card contains:

| Field | Description |
|---|---|
| Label | Auto-named "Projector 1", "Projector 2", etc. Editable. |
| Resolution | Width × Height in pixels (e.g. 1920×1080, 3840×2160) |
| Blend Left | Pixels of overlap on the left edge |
| Blend Right | Pixels of overlap on the right edge |
| Blend Top | Pixels of overlap on the top edge |
| Blend Bottom | Pixels of overlap on the bottom edge |

Add / remove projectors dynamically. Total canvas size is calculated and shown:
```
total_width = sum(projector_widths) - sum(all_blend_overlaps)
```

**Left panel — Display options:**

| Option | Description |
|---|---|
| Color bars | Toggle SMPTE-style color bars at the top of the pattern |
| Show blend zones | Overlay semi-transparent highlight on blend regions |
| Grid size | Pixel size of alignment grid cells (e.g. 100px) |
| Grid color | Color picker |
| Text color | Color picker |
| Background color | Color picker |
| Blend zone color | Color picker |

**Canvas output:**
- Projectors rendered side-by-side
- Blend zones shown as semi-transparent overlays
- Grid lines across the full composite canvas
- Projector labels (P1, P2, P3…) at top-left of each region
- Total canvas dimensions shown at bottom-left
- Optional SMPTE color bars

**Header actions:** Import JSON, Export JSON, Export PNG

---

## Preset System (JSON Import/Export)

Settings are exported as a JSON file and can be re-imported. Each mode has its own JSON structure. No server, no database — files live on the user's filesystem.

**Metric preset shape:**
```json
{
  "mode": "metric",
  "wall": { "width": 8.0, "height": 4.5, "unit": "m" },
  "dpi": 96,
  "gridSubdivision": 1.0,
  "lockedDimension": "width",
  "colors": {
    "background": "#ffffff",
    "grid": "#374151",
    "text": "#374151",
    "border": "#111111"
  }
}
```

**Pixel pattern preset shape:**
```json
{
  "mode": "pixel",
  "projectors": [
    { "label": "Projector 1", "width": 1920, "height": 1080, "blend": { "left": 0, "right": 40, "top": 0, "bottom": 0 } },
    { "label": "Projector 2", "width": 1920, "height": 1080, "blend": { "left": 40, "right": 40, "top": 0, "bottom": 0 } }
  ],
  "display": {
    "colorBars": true,
    "showBlendZones": true,
    "gridSize": 100
  },
  "colors": {
    "background": "#ffffff",
    "grid": "#374151",
    "text": "#374151",
    "blendZone": "#6366f1"
  }
}
```

Last-used preset filename is stored in `localStorage` for the home screen shortcut.

---

## Canvas Rendering

HTML5 Canvas API. Each mode has a `useCanvas` hook that accepts the current settings and redraws the canvas via `useEffect` whenever settings change. The canvas element is sized to fill the preview area; the exported PNG is rendered at full calculated resolution (not scaled).

Export flow:
1. Create an offscreen canvas at full output resolution
2. Render pattern at full size
3. Call `canvas.toBlob()` → trigger browser download

---

## Suggested Extra Features

These are included in the design and should be implemented:

| Feature | Mode | Description |
|---|---|---|
| Crosshair / registration marks | Both | Corner markers + center cross for physical alignment |
| Circle / concentric rings pattern | Both | Alternative to grid — useful for lens focus testing |
| Aspect ratio lock | Metric | Single toggle locks W:H ratio when editing either dimension |
| SMPTE color bars | Pixel | Full-width broadcast-standard color reference bars at top |
| Pattern type selector | Both | Grid, dots, crosshatch, solid color, gradient ramp |
| Projector label overlay | Pixel | "P1", "P2" etc. rendered on the exported canvas |
| Ruler / scale bar | Metric | Drawn on canvas showing real-world scale reference |

---

## File Structure

```
src/
  components/
    Home.jsx
    MetricMode.jsx
    PixelPatternMode.jsx
    CanvasPreview.jsx       shared canvas element + resize observer
    ColorPicker.jsx         reusable color input with hex display
    ProjectorCard.jsx       single projector config row
    ThemeToggle.jsx         dark/light mode switch
  hooks/
    useMetricState.js       metric mode state + derived pixel values
    usePixelState.js        pixel pattern state + total canvas calc
    useCanvas.js            canvas draw dispatcher
  utils/
    calculations.js         pixel-from-meter formula, blend math
    exportPng.js            offscreen canvas → PNG download
    presets.js              JSON serialize/deserialize + localStorage
  App.jsx                   top-level routing (no router lib needed, just state)
  main.jsx
  index.css                 minimal global styles + CSS variables for theme
```

---

## Out of Scope

- User accounts or server-side storage
- PDF export
- Real-time collaboration
- Undo/redo history
- Mobile layout (desktop-first)
