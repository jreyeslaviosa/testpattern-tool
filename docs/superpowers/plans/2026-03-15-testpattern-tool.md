# Projection Test Pattern Generator — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static Vite + React web app that generates projection test patterns in two modes: Metric Mode (real-world dimensions → pixel grid) and Pixel Pattern Mode (multi-projector blending canvas).

**Architecture:** Single-page React app with no router — top-level `App.jsx` manages a `view` state string (`home | metric | pixel`). Each mode is a self-contained workspace component with a left panel and a live canvas preview. All state is local React state; presets are serialized to/from JSON files and persisted in `localStorage`.

**Tech Stack:** Vite 5, React 18, Vitest + @testing-library/react for tests, HTML5 Canvas API for rendering, no external UI libraries.

---

## File Map

| File | Responsibility |
|---|---|
| `src/main.jsx` | React root mount |
| `src/App.jsx` | View router (home/metric/pixel), theme state |
| `src/index.css` | CSS custom properties for light/dark theme, global resets |
| `src/components/Home.jsx` | Mode selector cards + last-preset shortcut |
| `src/components/MetricMode.jsx` | Metric left panel + layout |
| `src/components/PixelPatternMode.jsx` | Pixel pattern left panel + layout |
| `src/components/CanvasPreview.jsx` | `<canvas>` element with ResizeObserver scaling |
| `src/components/ColorPicker.jsx` | Color swatch + hex input |
| `src/components/ProjectorCard.jsx` | Single projector config row |
| `src/components/ThemeToggle.jsx` | Light/dark toggle button |
| `src/hooks/useMetricState.js` | Metric mode state + derived pixel dimensions |
| `src/hooks/usePixelState.js` | Pixel pattern state + total canvas size |
| `src/hooks/useCanvas.js` | Calls draw function on settings change, sets canvas dimensions |
| `src/utils/calculations.js` | `metersToPixels`, `calcPixelTotal`, `calcProjectorPositions` |
| `src/utils/exportPng.js` | OffscreenCanvas render + file download |
| `src/utils/presets.js` | JSON serialize/deserialize, localStorage read/write |
| `src/utils/draw/drawMetric.js` | Renders metric grid/patterns to a canvas context |
| `src/utils/draw/drawPixelPattern.js` | Renders multi-projector pattern to a canvas context |
| `tests/utils/calculations.test.js` | Unit tests for all math functions |
| `tests/utils/presets.test.js` | Unit tests for preset import/export/validation |
| `tests/hooks/useMetricState.test.js` | Unit tests for metric state logic |
| `tests/hooks/usePixelState.test.js` | Unit tests for pixel state logic |

---

## Chunk 1: Project Scaffold + App Shell + Home Screen

### Task 1: Initialize Vite + React project

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.jsx`

- [ ] **Step 1: Scaffold project**

```bash
cd /Users/jaimereyes/Documents/gemini/claude/TESTPATTERN_TOOL
npm create vite@latest . -- --template react
npm install
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Configure Vitest in vite.config.js**

Replace `vite.config.js` content:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.js',
  },
})
```

- [ ] **Step 3: Create test setup file**

```bash
mkdir -p tests/utils tests/hooks
```

Create `tests/setup.js`:

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite dev server starts at `http://localhost:5173`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React project with Vitest"
```

---

### Task 2: CSS design tokens (light/dark theme)

**Files:**
- Create/replace: `src/index.css`

- [ ] **Step 1: Write theme CSS**

Replace `src/index.css`:

```css
:root {
  --bg-app: #f0f2f5;
  --bg-panel: #ffffff;
  --bg-input: #f9fafb;
  --border: #e5e7eb;
  --border-focus: #6366f1;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-label: #374151;
  --accent: #6366f1;
  --accent-hover: #4f46e5;
  --accent-text: #ffffff;
  --danger: #ef4444;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(99,102,241,0.15);
  --radius: 6px;
  --radius-sm: 3px;
}

[data-theme="dark"] {
  --bg-app: #0f1117;
  --bg-panel: #1a1d27;
  --bg-input: #111420;
  --border: #2d3147;
  --border-focus: #818cf8;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-label: #cbd5e1;
  --accent: #818cf8;
  --accent-hover: #6366f1;
  --accent-text: #ffffff;
  --danger: #f87171;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(99,102,241,0.25);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  background: var(--bg-app);
  color: var(--text-primary);
  height: 100vh;
  overflow: hidden;
}

#root { height: 100vh; display: flex; flex-direction: column; }

input[type="text"],
input[type="number"] {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  width: 100%;
}
input:focus { outline: none; border-color: var(--border-focus); }

button {
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text-primary);
  padding: 4px 10px;
}
button:hover { border-color: var(--accent); color: var(--accent); }

.btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-text);
  font-weight: 600;
}
.btn-primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); color: var(--accent-text); }

label { font-size: 11px; color: var(--text-label); font-weight: 500; }

.section-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  margin-top: 14px;
}
.section-title:first-child { margin-top: 0; }

.field-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}
.field-label { color: var(--text-secondary); white-space: nowrap; min-width: 52px; font-size: 11px; }
.field-unit { color: var(--text-secondary); font-size: 11px; }

.error-text { color: var(--danger); font-size: 10px; margin-top: 2px; }

.info-box {
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-panel));
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  font-size: 11px;
  color: var(--accent);
  margin: 8px 0;
}

.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 16px;
  box-shadow: var(--shadow-md);
  font-size: 12px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
}
.toast-error { border-color: var(--danger); color: var(--danger); }
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat: add light/dark theme CSS design tokens"
```

---

### Task 3: ThemeToggle component

**Files:**
- Create: `src/components/ThemeToggle.jsx`

- [ ] **Step 1: Write component**

```jsx
// src/components/ThemeToggle.jsx
export default function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      style={{ padding: '4px 10px', fontSize: 11 }}
    >
      {theme === 'light' ? '☾ Dark' : '☀ Light'}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ThemeToggle.jsx
git commit -m "feat: add ThemeToggle component"
```

---

### Task 4: App shell with theme and view routing

**Files:**
- Create/replace: `src/App.jsx`

- [ ] **Step 1: Write App.jsx**

```jsx
// src/App.jsx
import { useState, useEffect } from 'react'
import Home from './components/Home'
import MetricMode from './components/MetricMode'
import PixelPatternMode from './components/PixelPatternMode'
import ThemeToggle from './components/ThemeToggle'

export default function App() {
  const [view, setView] = useState('home')      // 'home' | 'metric' | 'pixel'
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [pendingPreset, setPendingPreset] = useState(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function navigateTo(viewName, preset = null) {
    setPendingPreset(preset)
    setView(viewName)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {view === 'home' && (
        <Home onNavigate={navigateTo} theme={theme} onThemeToggle={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />
      )}
      {view === 'metric' && (
        <MetricMode
          onHome={() => setView('home')}
          initialPreset={pendingPreset?.mode === 'metric' ? pendingPreset : null}
          theme={theme}
          onThemeToggle={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        />
      )}
      {view === 'pixel' && (
        <PixelPatternMode
          onHome={() => setView('home')}
          initialPreset={pendingPreset?.mode === 'pixel' ? pendingPreset : null}
          theme={theme}
          onThemeToggle={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create stub components so app doesn't crash**

Create `src/components/Home.jsx`:
```jsx
export default function Home({ onNavigate, theme, onThemeToggle }) {
  return <div>Home — stub</div>
}
```

Create `src/components/MetricMode.jsx`:
```jsx
export default function MetricMode({ onHome }) {
  return <div>Metric — stub</div>
}
```

Create `src/components/PixelPatternMode.jsx`:
```jsx
export default function PixelPatternMode({ onHome }) {
  return <div>Pixel — stub</div>
}
```

- [ ] **Step 3: Replace src/main.jsx**

```jsx
// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 4: Verify app renders**

```bash
npm run dev
```
Expected: "Home — stub" visible in browser, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/Home.jsx src/components/MetricMode.jsx src/components/PixelPatternMode.jsx src/main.jsx
git commit -m "feat: add App shell with view routing and theme toggle"
```

---

### Task 5: Home screen

**Files:**
- Modify: `src/components/Home.jsx`

- [ ] **Step 1: Write Home component**

```jsx
// src/components/Home.jsx
import ThemeToggle from './ThemeToggle'
import { loadLastPreset } from '../utils/presets'

export default function Home({ onNavigate, theme, onThemeToggle }) {
  const lastPreset = loadLastPreset()

  function handleLoad() {
    if (!lastPreset) return
    onNavigate(lastPreset.mode, lastPreset)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg-app)'
    }}>
      {/* Header */}
      <header style={{
        background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)',
        padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Projection Test Pattern Generator</span>
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
      </header>

      {/* Mode cards */}
      <main style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32
      }}>
        <ModeCard
          icon="📐"
          title="Metric Mode"
          description="Real-world wall dimensions → pixel grid. Meters, subdivisions, pixel lock."
          active
          onClick={() => onNavigate('metric')}
        />
        <ModeCard
          icon="📽"
          title="Pixel Pattern Mode"
          description="Multi-projector setup. Resolution, blending, color bars, alignment grid."
          onClick={() => onNavigate('pixel')}
        />
      </main>

      {/* Last preset shortcut */}
      {lastPreset && (
        <footer style={{
          padding: '10px 20px', borderTop: '1px solid var(--border)',
          background: 'var(--bg-panel)', display: 'flex', alignItems: 'center',
          gap: 10, justifyContent: 'center'
        }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
            Recent: <strong>{lastPreset._filename || 'preset.json'}</strong>
          </span>
          <button onClick={handleLoad} style={{ color: 'var(--accent)', border: 'none', background: 'none', padding: 0, fontSize: 11 }}>
            Load →
          </button>
        </footer>
      )}
    </div>
  )
}

function ModeCard({ icon, title, description, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--bg-panel)',
        border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: '28px 32px',
        textAlign: 'center',
        width: 200,
        cursor: 'pointer',
        boxShadow: active ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = active ? 'var(--accent)' : 'var(--border)'}
    >
      <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{description}</div>
    </button>
  )
}
```

- [ ] **Step 2: Create stub presets util (so Home doesn't crash)**

Create `src/utils/presets.js`:
```js
// src/utils/presets.js — stub, full implementation in Chunk 2
export function loadLastPreset() { return null }
export function saveLastPreset() {}
export function exportPreset() {}
export function importPreset() { return null }
```

- [ ] **Step 3: Verify Home renders**

```bash
npm run dev
```
Expected: Two mode cards visible. Theme toggle works.

- [ ] **Step 4: Commit**

```bash
git add src/components/Home.jsx src/utils/presets.js
git commit -m "feat: add Home mode selector screen"
```

---

## Chunk 2: Shared Utilities (calculations, presets, exportPng)

### Task 6: calculations.js — math functions with tests

**Files:**
- Create: `src/utils/calculations.js`
- Create: `tests/utils/calculations.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/utils/calculations.test.js
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
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run tests/utils/calculations.test.js
```
Expected: All tests fail (module not found)

- [ ] **Step 3: Implement calculations.js**

```js
// src/utils/calculations.js

/**
 * Convert meters to pixels.
 * Formula: pixels = (meters / 0.0254) * dpi
 */
export function metersToPixels(meters, dpi) {
  return Math.round((meters / 0.0254) * dpi)
}

/**
 * Calculate total composite canvas size.
 * @param {Array} projectors - array of { width, height, blend: { left, right, top, bottom } }
 * @param {'horizontal'|'vertical'} direction
 * @returns {{ totalWidth: number, totalHeight: number }}
 */
export function calcPixelTotal(projectors, direction) {
  if (direction === 'horizontal') {
    const totalWidth = projectors.reduce((sum, p, i) => {
      return sum + p.width - (i < projectors.length - 1 ? p.blend.right : 0)
    }, 0)
    const totalHeight = Math.max(...projectors.map(p => p.height))
    return { totalWidth, totalHeight }
  } else {
    const totalHeight = projectors.reduce((sum, p, i) => {
      return sum + p.height - (i < projectors.length - 1 ? p.blend.bottom : 0)
    }, 0)
    const totalWidth = Math.max(...projectors.map(p => p.width))
    return { totalWidth, totalHeight }
  }
}

/**
 * Calculate the (x, y) origin of each projector in the composite canvas.
 * @param {Array} projectors
 * @param {'horizontal'|'vertical'} direction
 * @returns {Array<{ x: number, y: number }>}
 */
export function calcProjectorPositions(projectors, direction) {
  const positions = []
  let cursor = 0
  for (let i = 0; i < projectors.length; i++) {
    if (direction === 'horizontal') {
      positions.push({ x: cursor, y: 0 })
      cursor += projectors[i].width - projectors[i].blend.right
    } else {
      positions.push({ x: 0, y: cursor })
      cursor += projectors[i].height - projectors[i].blend.bottom
    }
  }
  return positions
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run tests/utils/calculations.test.js
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/calculations.js tests/utils/calculations.test.js
git commit -m "feat: add calculations utility with full test coverage"
```

---

### Task 7: presets.js — import/export/validation with tests

**Files:**
- Modify: `src/utils/presets.js`
- Create: `tests/utils/presets.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/utils/presets.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
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
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run tests/utils/presets.test.js
```
Expected: Failures (functions not implemented)

- [ ] **Step 3: Implement presets.js**

```js
// src/utils/presets.js

/**
 * Validate a raw preset object.
 * Returns { valid: true, preset } or { valid: false, error, warningSkipped? }
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
    if (!Array.isArray(raw.projectors) || raw.projectors.length === 0) {
      return { valid: false, error: 'No projectors defined' }
    }
    const validProj = raw.projectors.filter(
      p => typeof p.width === 'number' && typeof p.height === 'number'
    )
    if (validProj.length === 0) {
      return { valid: false, error: 'No valid projectors after filtering' }
    }
    const skipped = validProj.length < raw.projectors.length
    return { valid: true, preset: { ...raw, projectors: validProj }, warningSkipped: skipped }
  }
  return { valid: false, error: 'Unknown mode' }
}

/** Serialize preset state to JSON string. */
export function serializePreset(state) {
  return JSON.stringify(state, null, 2)
}

/** Parse JSON string into preset object. Returns null on parse error. */
export function deserializePreset(json) {
  try { return JSON.parse(json) } catch { return null }
}

/** Persist full preset JSON to localStorage (call on Export JSON). */
export function saveLastPreset(preset, filename) {
  try {
    localStorage.setItem('lastPreset', JSON.stringify({ ...preset, _filename: filename }))
  } catch {}
}

/** Load last preset from localStorage. Returns null if none. */
export function loadLastPreset() {
  try {
    const raw = localStorage.getItem('lastPreset')
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

/**
 * Trigger browser file download of preset JSON.
 * @param {object} state - current mode state
 * @param {string} filename - suggested filename
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
 * Read a File object and return validated preset or null.
 * Returns { preset, warningSkipped } on success, throws on error.
 */
export async function readPresetFile(file) {
  const text = await file.text()
  const raw = deserializePreset(text)
  if (!raw) throw new Error('Invalid preset file')
  const result = validatePreset(raw)
  if (!result.valid) throw new Error('Invalid preset file')
  return { preset: { ...result.preset, _filename: file.name }, warningSkipped: result.warningSkipped }
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run tests/utils/presets.test.js
```
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/presets.js tests/utils/presets.test.js
git commit -m "feat: add preset system with validation, import/export, localStorage"
```

---

### Task 8: exportPng.js

**Files:**
- Create: `src/utils/exportPng.js`

- [ ] **Step 1: Implement exportPng**

```js
// src/utils/exportPng.js
import { drawMetric } from './draw/drawMetric'
import { drawPixelPattern } from './draw/drawPixelPattern'

/**
 * Render pattern to OffscreenCanvas and trigger PNG download.
 * @param {object} settings - full mode state (must have .mode, .outputWidth, .outputHeight)
 * @param {string} filename
 */
export async function exportPng(settings, filename = 'pattern.png') {
  const { outputWidth, outputHeight } = settings
  const offscreen = new OffscreenCanvas(outputWidth, outputHeight)
  const ctx = offscreen.getContext('2d')
  if (settings.mode === 'metric') {
    drawMetric(ctx, settings)
  } else {
    drawPixelPattern(ctx, settings)
  }
  const blob = await offscreen.convertToBlob({ type: 'image/png' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Create draw stubs** (so export doesn't crash during integration)

```bash
mkdir -p src/utils/draw
```

Create `src/utils/draw/drawMetric.js`:
```js
export function drawMetric(ctx, settings) {
  const { outputWidth, outputHeight, colors } = settings
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, outputWidth, outputHeight)
  // Full implementation in Chunk 3
}
```

Create `src/utils/draw/drawPixelPattern.js`:
```js
export function drawPixelPattern(ctx, settings) {
  const { outputWidth, outputHeight, colors } = settings
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, outputWidth, outputHeight)
  // Full implementation in Chunk 3
}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/exportPng.js src/utils/draw/drawMetric.js src/utils/draw/drawPixelPattern.js
git commit -m "feat: add exportPng utility and draw stubs"
```

---

## Chunk 3: Canvas Draw Functions

### Task 9: drawMetric.js — full implementation

**Files:**
- Modify: `src/utils/draw/drawMetric.js`

The `settings` object shape for metric mode:
```js
{
  mode: 'metric',
  outputWidth: number,    // calculated pixel width
  outputHeight: number,   // calculated pixel height
  gridInterval: number,   // pixels per grid cell = metersToPixels(gridSubdivision, dpi)
  patternType: 'grid' | 'dots' | 'crosshatch' | 'solid' | 'gradient',
  colors: { background, pattern, text, border },
  wall: { width, height },   // in meters
  gridSubdivision: number,   // in meters
}
```

- [ ] **Step 1: Implement drawMetric**

```js
// src/utils/draw/drawMetric.js

export function drawMetric(ctx, settings) {
  const { outputWidth, outputHeight, gridInterval, patternType, colors, wall, gridSubdivision } = settings

  // 1. Background
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, outputWidth, outputHeight)

  // 2. Border
  ctx.strokeStyle = colors.border
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, outputWidth - 2, outputHeight - 2)

  // 3. Pattern
  drawPattern(ctx, outputWidth, outputHeight, gridInterval, patternType, colors)

  // 4. Registration marks (corners + center)
  drawRegistrationMarks(ctx, outputWidth, outputHeight, colors.pattern)

  // 5. Dimension label
  ctx.fillStyle = colors.text
  ctx.font = `${Math.max(12, Math.round(outputHeight * 0.018))}px monospace`
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'left'
  ctx.fillText(
    `${wall.width}m × ${wall.height}m  ·  ${gridSubdivision}m/grid  ·  ${outputWidth}×${outputHeight}px`,
    10, outputHeight - 8
  )
}

function drawPattern(ctx, w, h, interval, type, colors) {
  if (!interval || interval <= 0) return
  ctx.strokeStyle = colors.pattern
  ctx.fillStyle = colors.pattern

  if (type === 'solid') return

  if (type === 'grid') {
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= w; x += interval) { ctx.moveTo(x, 0); ctx.lineTo(x, h) }
    for (let y = 0; y <= h; y += interval) { ctx.moveTo(0, y); ctx.lineTo(w, y) }
    ctx.stroke()
    return
  }

  if (type === 'dots') {
    for (let x = 0; x <= w; x += interval) {
      for (let y = 0; y <= h; y += interval) {
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill()
      }
    }
    return
  }

  if (type === 'crosshatch') {
    ctx.lineWidth = 1
    ctx.beginPath()
    const diag = Math.max(w, h) * 2
    for (let i = -diag; i <= diag; i += interval) {
      ctx.moveTo(i, 0); ctx.lineTo(i + h, h)
      ctx.moveTo(i, 0); ctx.lineTo(i - h, h)
    }
    ctx.stroke()
    return
  }

  if (type === 'gradient') {
    const hGrad = ctx.createLinearGradient(0, 0, w, 0)
    hGrad.addColorStop(0, colors.pattern)
    hGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = hGrad
    ctx.fillRect(0, 0, w, h)

    ctx.globalCompositeOperation = 'source-over'
    const vGrad = ctx.createLinearGradient(0, 0, 0, h)
    vGrad.addColorStop(0, hexToRgba(colors.pattern, 0.5))
    vGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = vGrad
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
  }
}

function drawRegistrationMarks(ctx, w, h, color) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  const size = Math.min(w, h) * 0.03

  const corners = [[0, 0], [w, 0], [w, h], [0, h]]
  corners.forEach(([cx, cy]) => {
    const dx = cx === 0 ? 1 : -1
    const dy = cy === 0 ? 1 : -1
    ctx.beginPath()
    ctx.moveTo(cx + dx * size, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * size)
    ctx.stroke()
  })

  // Center crosshair
  const mx = w / 2, my = h / 2
  ctx.beginPath()
  ctx.moveTo(mx - size, my); ctx.lineTo(mx + size, my)
  ctx.moveTo(mx, my - size); ctx.lineTo(mx, my + size)
  ctx.stroke()
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/draw/drawMetric.js
git commit -m "feat: implement drawMetric canvas renderer"
```

---

### Task 10: drawPixelPattern.js — full implementation

**Files:**
- Modify: `src/utils/draw/drawPixelPattern.js`

The `settings` object shape for pixel pattern mode:
```js
{
  mode: 'pixel',
  outputWidth: number,
  outputHeight: number,
  projectors: Array<{ label, width, height, blend: { left, right, top, bottom } }>,
  positions: Array<{ x, y }>,   // from calcProjectorPositions
  display: { layoutDirection, colorBars, showBlendZones, gridSize, patternType },
  colors: { background, pattern, text, blendZone },
}
```

- [ ] **Step 1: Implement drawPixelPattern**

```js
// src/utils/draw/drawPixelPattern.js

const SMPTE_BARS = [
  '#c0c0c0','#c0c000','#00c0c0','#00c000','#c000c0','#c00000','#0000c0'
]

export function drawPixelPattern(ctx, settings) {
  const { outputWidth, outputHeight, projectors, positions, display, colors } = settings
  const { colorBars, showBlendZones, gridSize, patternType } = display

  // 1. Background
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, outputWidth, outputHeight)

  // 2. Color bars (10% height, min 40px)
  let patternTop = 0
  if (colorBars) {
    const barHeight = Math.max(40, Math.round(outputHeight * 0.1))
    const barWidth = outputWidth / 7
    SMPTE_BARS.forEach((color, i) => {
      ctx.fillStyle = color
      ctx.fillRect(Math.round(i * barWidth), 0, Math.round(barWidth), barHeight)
    })
    patternTop = barHeight
  }

  const patternHeight = outputHeight - patternTop

  // 3. Pattern across full composite canvas (below color bars)
  drawPattern(ctx, outputWidth, patternHeight, patternTop, gridSize, patternType, colors)

  // 4. Blend zone overlays
  if (showBlendZones) {
    ctx.globalAlpha = 0.3
    ctx.fillStyle = colors.blendZone
    projectors.forEach((p, i) => {
      const { x, y } = positions[i]
      if (p.blend.left > 0)   ctx.fillRect(x, 0, p.blend.left, outputHeight)
      if (p.blend.right > 0)  ctx.fillRect(x + p.width - p.blend.right, 0, p.blend.right, outputHeight)
      if (p.blend.top > 0)    ctx.fillRect(x, y, p.width, p.blend.top)
      if (p.blend.bottom > 0) ctx.fillRect(x, y + p.height - p.blend.bottom, p.width, p.blend.bottom)
    })
    ctx.globalAlpha = 1
  }

  // 5. Projector boundary lines
  ctx.strokeStyle = colors.pattern
  ctx.lineWidth = 1
  ctx.setLineDash([6, 4])
  projectors.forEach((p, i) => {
    const { x, y } = positions[i]
    ctx.strokeRect(x, y, p.width, p.height)
  })
  ctx.setLineDash([])

  // 6. Projector labels
  const labelSize = Math.max(12, Math.round(outputHeight * 0.02))
  ctx.font = `bold ${labelSize}px monospace`
  ctx.fillStyle = colors.text
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  projectors.forEach((p, i) => {
    const { x, y } = positions[i]
    const label = p.label || `P${i + 1}`
    ctx.fillText(label, x + 8, y + 8)
  })

  // 7. Canvas dimensions label
  ctx.font = `${Math.max(10, Math.round(outputHeight * 0.015))}px monospace`
  ctx.textBaseline = 'bottom'
  ctx.fillText(`${outputWidth}×${outputHeight}px total`, 10, outputHeight - 6)
}

function drawPattern(ctx, w, h, offsetY, interval, type, colors) {
  if (!interval || interval <= 0 || type === 'solid') return

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, offsetY, w, h)
  ctx.clip()

  ctx.strokeStyle = colors.pattern
  ctx.fillStyle = colors.pattern

  if (type === 'grid') {
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= w; x += interval) { ctx.moveTo(x, offsetY); ctx.lineTo(x, offsetY + h) }
    for (let y = offsetY + interval; y <= offsetY + h; y += interval) { ctx.moveTo(0, y); ctx.lineTo(w, y) }
    ctx.stroke()
  } else if (type === 'dots') {
    for (let x = 0; x <= w; x += interval) {
      for (let y = offsetY; y <= offsetY + h; y += interval) {
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill()
      }
    }
  } else if (type === 'crosshatch') {
    ctx.lineWidth = 1
    ctx.beginPath()
    const diag = Math.max(w, h) * 2
    for (let i = -diag; i <= diag; i += interval) {
      ctx.moveTo(i, offsetY); ctx.lineTo(i + h, offsetY + h)
      ctx.moveTo(i, offsetY); ctx.lineTo(i - h, offsetY + h)
    }
    ctx.stroke()
  } else if (type === 'gradient') {
    const hGrad = ctx.createLinearGradient(0, 0, w, 0)
    hGrad.addColorStop(0, colors.pattern)
    hGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = hGrad
    ctx.fillRect(0, offsetY, w, h)
    const vGrad = ctx.createLinearGradient(0, offsetY, 0, offsetY + h)
    vGrad.addColorStop(0, hexToRgba(colors.pattern, 0.5))
    vGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = vGrad
    ctx.fillRect(0, offsetY, w, h)
  }

  ctx.restore()
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/draw/drawPixelPattern.js
git commit -m "feat: implement drawPixelPattern canvas renderer"
```

---

## Chunk 4: Shared Components + Metric Mode

### Task 11: CanvasPreview component

**Files:**
- Create: `src/components/CanvasPreview.jsx`

- [ ] **Step 1: Implement CanvasPreview**

```jsx
// src/components/CanvasPreview.jsx
import { useRef, useEffect } from 'react'
import { useCanvas } from '../hooks/useCanvas'

export default function CanvasPreview({ settings }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  // Pass containerRef so ResizeObserver watches the correct container element
  useCanvas(containerRef, canvasRef, settings)

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'hidden',
        background: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          display: 'block',
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Implement useCanvas hook with ResizeObserver**

`useCanvas` accepts a `containerRef` in addition to `canvasRef` so it observes the correct element.

Create `src/hooks/useCanvas.js`:

```js
// src/hooks/useCanvas.js
import { useEffect, useRef } from 'react'
import { drawMetric } from '../utils/draw/drawMetric'
import { drawPixelPattern } from '../utils/draw/drawPixelPattern'

// containerRef: ref to the wrapping div (used for ResizeObserver)
// canvasRef: ref to the <canvas> element
// settings: full mode state including outputWidth / outputHeight
export function useCanvas(containerRef, canvasRef, settings) {
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // Redraw when settings change
  useEffect(() => {
    redraw(canvasRef.current, settings)
  }, [settings])

  // Redraw when the container div resizes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      redraw(canvasRef.current, settingsRef.current)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])
}

function redraw(canvas, settings) {
  if (!canvas || !settings) return
  const { outputWidth, outputHeight } = settings
  if (!outputWidth || !outputHeight || outputWidth <= 0 || outputHeight <= 0) return

  canvas.width = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext('2d')

  if (settings.mode === 'metric') {
    drawMetric(ctx, settings)
  } else if (settings.mode === 'pixel') {
    drawPixelPattern(ctx, settings)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/CanvasPreview.jsx src/hooks/useCanvas.js
git commit -m "feat: add CanvasPreview component and useCanvas hook"
```

---

### Task 12: ColorPicker component

**Files:**
- Create: `src/components/ColorPicker.jsx`

- [ ] **Step 1: Implement ColorPicker**

```jsx
// src/components/ColorPicker.jsx
export default function ColorPicker({ label, value, onChange }) {
  return (
    <div className="field-row" style={{ marginBottom: 5 }}>
      <span className="field-label">{label}</span>
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: 24, height: 24, border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', padding: 1 }}
      />
      <input
        type="text"
        value={value}
        onChange={e => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && onChange(e.target.value)}
        style={{ width: 72, fontFamily: 'monospace', fontSize: 11 }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ColorPicker.jsx
git commit -m "feat: add ColorPicker component"
```

---

### Task 13: useMetricState hook with tests

**Files:**
- Create: `src/hooks/useMetricState.js`
- Create: `tests/hooks/useMetricState.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/hooks/useMetricState.test.js
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMetricState } from '../../src/hooks/useMetricState'

describe('useMetricState', () => {
  it('initializes with defaults', () => {
    const { result } = renderHook(() => useMetricState(null))
    expect(result.current.state.wall.width).toBe(8.0)
    expect(result.current.state.dpi).toBe(96)
    expect(result.current.state.lock.width).toBe(false)
  })

  it('calculates outputWidth and outputHeight from meters+DPI', () => {
    const { result } = renderHook(() => useMetricState(null))
    // 8m at 96dpi = 8 / 0.0254 * 96 = 30236
    expect(result.current.settings.outputWidth).toBe(30236)
  })

  it('updates wall width', () => {
    const { result } = renderHook(() => useMetricState(null))
    act(() => result.current.setWall('width', 4.0))
    expect(result.current.state.wall.width).toBe(4.0)
  })

  it('lock prevents recalculation', () => {
    const { result } = renderHook(() => useMetricState(null))
    // Lock width at current value
    const lockedW = result.current.settings.outputWidth
    act(() => result.current.toggleLock('width'))
    act(() => result.current.setWall('width', 4.0))
    expect(result.current.settings.outputWidth).toBe(lockedW)
  })

  it('lock does not engage when width is invalid', () => {
    const { result } = renderHook(() => useMetricState(null))
    act(() => result.current.setWall('width', -1))
    act(() => result.current.toggleLock('width'))
    expect(result.current.state.lock.width).toBe(false)
  })

  it('initializes from preset', () => {
    const preset = {
      mode: 'metric', wall: { width: 5, height: 3 }, dpi: 72,
      lock: { width: false, height: false, pixelWidth: null, pixelHeight: null },
      gridSubdivision: 0.5, patternType: 'dots',
      colors: { background: '#000', pattern: '#fff', text: '#fff', border: '#fff' },
    }
    const { result } = renderHook(() => useMetricState(preset))
    expect(result.current.state.wall.width).toBe(5)
    expect(result.current.state.dpi).toBe(72)
  })
})
```

- [ ] **Step 2: Run — expect failures**

```bash
npx vitest run tests/hooks/useMetricState.test.js
```

- [ ] **Step 3: Implement useMetricState**

```js
// src/hooks/useMetricState.js
import { useState, useMemo } from 'react'
import { metersToPixels } from '../utils/calculations'

const DEFAULTS = {
  mode: 'metric',
  wall: { width: 8.0, height: 4.5 },
  dpi: 96,
  lock: { width: false, height: false, pixelWidth: null, pixelHeight: null },
  gridSubdivision: 1.0,
  patternType: 'grid',
  colors: { background: '#ffffff', pattern: '#374151', text: '#374151', border: '#111111' },
}

export function useMetricState(initialPreset) {
  const [state, setState] = useState(() => initialPreset ? { ...DEFAULTS, ...initialPreset } : DEFAULTS)

  const settings = useMemo(() => {
    const rawW = metersToPixels(state.wall.width, state.dpi)
    const rawH = metersToPixels(state.wall.height, state.dpi)
    const outputWidth  = state.lock.width  && state.lock.pixelWidth  ? state.lock.pixelWidth  : rawW
    const outputHeight = state.lock.height && state.lock.pixelHeight ? state.lock.pixelHeight : rawH
    const gridInterval = metersToPixels(state.gridSubdivision, state.dpi)
    return { ...state, outputWidth, outputHeight, gridInterval }
  }, [state])

  function setWall(key, value) {
    setState(s => ({ ...s, wall: { ...s.wall, [key]: value } }))
  }

  function setDpi(value) {
    setState(s => ({ ...s, dpi: value }))
  }

  function setGridSubdivision(value) {
    setState(s => ({ ...s, gridSubdivision: value }))
  }

  function setPatternType(value) {
    setState(s => ({ ...s, patternType: value }))
  }

  function setColor(key, value) {
    setState(s => ({ ...s, colors: { ...s.colors, [key]: value } }))
  }

  function toggleLock(key) {
    setState(s => {
      const currentPixels = key === 'width'
        ? metersToPixels(s.wall.width, s.dpi)
        : metersToPixels(s.wall.height, s.dpi)
      if (!s.lock[key]) {
        // Engaging lock — validate first
        const dim = key === 'width' ? s.wall.width : s.wall.height
        if (!dim || dim <= 0) return s // don't engage
        return {
          ...s,
          lock: { ...s.lock, [key]: true, [`pixel${key.charAt(0).toUpperCase() + key.slice(1)}`]: currentPixels },
        }
      } else {
        // Releasing lock
        return {
          ...s,
          lock: { ...s.lock, [key]: false, [`pixel${key.charAt(0).toUpperCase() + key.slice(1)}`]: null },
        }
      }
    })
  }

  function applyPreset(preset) {
    setState({ ...DEFAULTS, ...preset })
  }

  return { state, settings, setWall, setDpi, setGridSubdivision, setPatternType, setColor, toggleLock, applyPreset }
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run tests/hooks/useMetricState.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMetricState.js tests/hooks/useMetricState.test.js
git commit -m "feat: add useMetricState hook with tests"
```

---

### Task 14: MetricMode UI component

**Files:**
- Modify: `src/components/MetricMode.jsx`

- [ ] **Step 1: Implement MetricMode**

```jsx
// src/components/MetricMode.jsx
import { useRef, useState } from 'react'
import { useMetricState } from '../hooks/useMetricState'
import CanvasPreview from './CanvasPreview'
import ColorPicker from './ColorPicker'
import ThemeToggle from './ThemeToggle'
import { downloadPreset, readPresetFile } from '../utils/presets'
import { exportPng } from '../utils/exportPng'

export default function MetricMode({ onHome, initialPreset, theme, onThemeToggle }) {
  const { state, settings, setWall, setDpi, setGridSubdivision, setPatternType, setColor, toggleLock, applyPreset } = useMetricState(initialPreset)
  const [toast, setToast] = useState(null)
  const fileRef = useRef(null)

  const errors = validate(state)
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
      if (preset.mode !== 'metric') {
        showToast('This is a pixel preset — switching modes is handled from Home.', true)
        return
      }
      applyPreset(preset)
      if (warningSkipped) showToast('Some projectors had invalid data and were skipped.')
    } catch {
      showToast('Invalid preset file', true)
    }
    e.target.value = ''
  }

  // downloadPreset (implemented in Task 7) calls saveLastPreset internally before
  // triggering the file download — this satisfies the spec requirement to persist
  // the full preset JSON to localStorage under key `lastPreset` on Export JSON.
  function handleExport() {
    downloadPreset(state, `metric-${state.wall.width}x${state.wall.height}.json`)
  }

  async function handleExportPng() {
    if (hasErrors) return
    await exportPng(settings, `pattern-${settings.outputWidth}x${settings.outputHeight}.png`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header style={{
        background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)',
        padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onHome} style={{ color: 'var(--accent)', border: 'none', background: 'none', fontSize: 12 }}>← Home</button>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Metric Mode</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <button onClick={() => fileRef.current.click()}>Import JSON</button>
          <button onClick={handleExport}>Export JSON</button>
          <button className="btn-primary" onClick={handleExportPng} disabled={hasErrors}>Export PNG</button>
        </div>
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel */}
        <aside style={{
          width: 220, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)',
          padding: 12, overflowY: 'auto', flexShrink: 0
        }}>
          <div className="section-title">Wall Dimensions</div>

          <DimField label="Width" value={state.wall.width} locked={state.lock.width}
            onLock={() => toggleLock('width')} onChange={v => setWall('width', v)}
            error={errors.width} />
          <DimField label="Height" value={state.wall.height} locked={state.lock.height}
            onLock={() => toggleLock('height')} onChange={v => setWall('height', v)}
            error={errors.height} />

          <div className="field-row" style={{ marginBottom: 5 }}>
            <span className="field-label">DPI</span>
            <input type="number" min="1" value={state.dpi} onChange={e => setDpi(Number(e.target.value))} style={{ width: 70 }} />
            {errors.dpi && <span className="error-text">{errors.dpi}</span>}
          </div>

          <div className="info-box">
            → <strong>{settings.outputWidth} × {settings.outputHeight} px</strong>
            {(state.lock.width || state.lock.height) && (
              <div style={{ fontSize: 10, marginTop: 2 }}>
                {state.lock.width ? 'W locked' : ''}{state.lock.width && state.lock.height ? ' · ' : ''}{state.lock.height ? 'H locked' : ''}
              </div>
            )}
          </div>

          <div className="section-title">Grid</div>
          <div className="field-row">
            <span className="field-label">Subdivision</span>
            <input type="number" min="0.01" step="0.25" value={state.gridSubdivision}
              onChange={e => setGridSubdivision(Number(e.target.value))} style={{ width: 70 }} />
            <span className="field-unit">m</span>
          </div>
          {errors.grid && <div className="error-text">{errors.grid}</div>}

          <div className="section-title">Pattern</div>
          <select value={state.patternType} onChange={e => setPatternType(e.target.value)}
            style={{ width: '100%', marginBottom: 8, padding: '4px 6px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-primary)' }}>
            {['grid','dots','crosshatch','solid','gradient'].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>

          <div className="section-title">Colors</div>
          <ColorPicker label="Background" value={state.colors.background} onChange={v => setColor('background', v)} />
          <ColorPicker label="Pattern" value={state.colors.pattern} onChange={v => setColor('pattern', v)} />
          <ColorPicker label="Text" value={state.colors.text} onChange={v => setColor('text', v)} />
          <ColorPicker label="Border" value={state.colors.border} onChange={v => setColor('border', v)} />
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

function DimField({ label, value, locked, onLock, onChange, error }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div className="field-row">
        <span className="field-label">{label}</span>
        <input type="number" min="0.01" step="0.1" value={value}
          onChange={e => onChange(Number(e.target.value))} style={{ width: 80 }} />
        <span className="field-unit">m</span>
        <button onClick={onLock} title={locked ? 'Unlock' : 'Lock'}
          style={{ padding: '2px 6px', color: locked ? 'var(--accent)' : 'var(--text-secondary)', borderColor: locked ? 'var(--accent)' : 'var(--border)' }}>
          {locked ? '🔒' : '🔓'}
        </button>
      </div>
      {error && <div className="error-text">{error}</div>}
    </div>
  )
}

function validate(state) {
  const errors = {}
  if (!state.wall.width || state.wall.width <= 0) errors.width = 'Must be greater than 0'
  if (!state.wall.height || state.wall.height <= 0) errors.height = 'Must be greater than 0'
  if (!state.dpi || state.dpi < 1) errors.dpi = 'Must be at least 1'
  if (!state.gridSubdivision || state.gridSubdivision <= 0 || state.gridSubdivision > Math.min(state.wall.width, state.wall.height)) {
    errors.grid = 'Must be between 0 and the smaller wall dimension'
  }
  return errors
}
```

- [ ] **Step 2: Verify Metric Mode renders and canvas updates live**

```bash
npm run dev
```
Navigate to Metric Mode. Change wall width — pixel output display should update. Change colors — canvas should update.

- [ ] **Step 3: Commit**

```bash
git add src/components/MetricMode.jsx
git commit -m "feat: implement Metric Mode UI with live canvas preview"
```

---

## Chunk 5: Pixel Pattern Mode

### Task 15: usePixelState hook with tests

**Files:**
- Create: `src/hooks/usePixelState.js`
- Create: `tests/hooks/usePixelState.test.js`

- [ ] **Step 1: Write failing tests**

```js
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
```

- [ ] **Step 2: Run — expect failures**

```bash
npx vitest run tests/hooks/usePixelState.test.js
```

- [ ] **Step 3: Implement usePixelState**

```js
// src/hooks/usePixelState.js
import { useState, useMemo } from 'react'
import { calcPixelTotal, calcProjectorPositions } from '../utils/calculations'

const DEFAULT_PROJECTOR = {
  label: 'Projector 1',
  width: 1920,
  height: 1080,
  blend: { left: 0, right: 0, top: 0, bottom: 0 },
}

const DEFAULTS = {
  mode: 'pixel',
  projectors: [{ ...DEFAULT_PROJECTOR }],
  display: {
    layoutDirection: 'horizontal',
    colorBars: false,
    showBlendZones: true,
    gridSize: 100,
    patternType: 'grid',
  },
  colors: {
    background: '#ffffff',
    pattern: '#374151',
    text: '#374151',
    blendZone: '#6366f1',
  },
}

export function usePixelState(initialPreset) {
  const [state, setState] = useState(() => initialPreset ? { ...DEFAULTS, ...initialPreset } : DEFAULTS)

  const settings = useMemo(() => {
    const { totalWidth, totalHeight } = calcPixelTotal(state.projectors, state.display.layoutDirection)
    const positions = calcProjectorPositions(state.projectors, state.display.layoutDirection)
    return {
      ...state,
      outputWidth: totalWidth,
      outputHeight: totalHeight,
      positions,
    }
  }, [state])

  function addProjector() {
    setState(s => ({
      ...s,
      projectors: [
        ...s.projectors,
        { ...DEFAULT_PROJECTOR, label: `Projector ${s.projectors.length + 1}` },
      ],
    }))
  }

  function removeProjector(index) {
    setState(s => {
      if (s.projectors.length <= 1) return s
      return { ...s, projectors: s.projectors.filter((_, i) => i !== index) }
    })
  }

  function updateProjector(index, key, value) {
    setState(s => ({
      ...s,
      projectors: s.projectors.map((p, i) => i === index ? { ...p, [key]: value } : p),
    }))
  }

  function updateProjectorBlend(index, edge, value) {
    setState(s => ({
      ...s,
      projectors: s.projectors.map((p, i) =>
        i === index ? { ...p, blend: { ...p.blend, [edge]: value } } : p
      ),
    }))
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

  return {
    state, settings,
    addProjector, removeProjector, updateProjector, updateProjectorBlend,
    setDisplay, setColor, applyPreset,
  }
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run tests/hooks/usePixelState.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePixelState.js tests/hooks/usePixelState.test.js
git commit -m "feat: add usePixelState hook with tests"
```

---

### Task 16: ProjectorCard component

**Files:**
- Create: `src/components/ProjectorCard.jsx`

- [ ] **Step 1: Implement ProjectorCard**

```jsx
// src/components/ProjectorCard.jsx
export default function ProjectorCard({ projector, index, onUpdate, onUpdateBlend, onRemove, errors = {} }) {
  return (
    <div style={{
      background: 'var(--bg-input)', border: '1px solid var(--border)',
      borderRadius: 4, padding: 8, marginBottom: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <input
          type="text"
          value={projector.label}
          onChange={e => onUpdate(index, 'label', e.target.value)}
          style={{ fontWeight: 600, fontSize: 11, width: 120, background: 'transparent', border: 'none', color: 'var(--text-primary)' }}
        />
        <button onClick={() => onRemove(index)}
          style={{ color: 'var(--danger)', border: 'none', background: 'none', padding: '0 4px', fontSize: 12 }}>✕</button>
      </div>

      <div className="field-row">
        <span className="field-label" style={{ minWidth: 42 }}>Res</span>
        <input type="number" min="1" value={projector.width}
          onChange={e => onUpdate(index, 'width', Number(e.target.value))}
          style={{ width: 56, borderColor: errors.width ? 'var(--danger)' : undefined }} />
        <span className="field-unit">×</span>
        <input type="number" min="1" value={projector.height}
          onChange={e => onUpdate(index, 'height', Number(e.target.value))}
          style={{ width: 56, borderColor: errors.height ? 'var(--danger)' : undefined }} />
        <span className="field-unit">px</span>
      </div>
      {(errors.width || errors.height) && <div className="error-text">Must be ≥ 1</div>}

      {[['left','L','blendL'],['right','R','blendR'],['top','T','blendT'],['bottom','B','blendB']].map(([edge, short, errKey]) => (
        <div key={edge}>
          <div className="field-row">
            <span className="field-label" style={{ minWidth: 42 }}>Blend {short}</span>
            <input type="number" min="0" value={projector.blend[edge]}
              onChange={e => onUpdateBlend(index, edge, Number(e.target.value))}
              style={{ width: 60, borderColor: errors[errKey] ? 'var(--danger)' : undefined }} />
            <span className="field-unit">px</span>
          </div>
          {errors[errKey] && <div className="error-text">Must be 0 to &lt; {edge === 'left' || edge === 'right' ? 'width' : 'height'}</div>}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProjectorCard.jsx
git commit -m "feat: add ProjectorCard component"
```

---

### Task 17: PixelPatternMode UI component

**Files:**
- Modify: `src/components/PixelPatternMode.jsx`

- [ ] **Step 1: Implement PixelPatternMode**

```jsx
// src/components/PixelPatternMode.jsx
import { useRef, useState } from 'react'
import { usePixelState } from '../hooks/usePixelState'
import CanvasPreview from './CanvasPreview'
import ColorPicker from './ColorPicker'
import ProjectorCard from './ProjectorCard'
import ThemeToggle from './ThemeToggle'
import { downloadPreset, readPresetFile } from '../utils/presets'
import { exportPng } from '../utils/exportPng'

export default function PixelPatternMode({ onHome, initialPreset, theme, onThemeToggle }) {
  const {
    state, settings,
    addProjector, removeProjector, updateProjector, updateProjectorBlend,
    setDisplay, setColor, applyPreset,
  } = usePixelState(initialPreset)
  const [toast, setToast] = useState(null)
  const fileRef = useRef(null)

  const errors = validatePixel(state)  // keys: `p0width`, `p0blendR`, `gridSize`, etc.
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
      if (preset.mode !== 'pixel') {
        showToast('This is a metric preset — switching modes is handled from Home.', true)
        return
      }
      applyPreset(preset)
      if (warningSkipped) showToast('Some projectors had invalid data and were skipped.')
    } catch {
      showToast('Invalid preset file', true)
    }
    e.target.value = ''
  }

  function handleExport() {
    downloadPreset(state, `pixel-${state.projectors.length}proj.json`)
  }

  async function handleExportPng() {
    if (hasErrors) return
    await exportPng(settings, `pattern-${settings.outputWidth}x${settings.outputHeight}.png`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header style={{
        background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)',
        padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
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
          {/* Layout direction */}
          <div className="section-title">Layout</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {['horizontal','vertical'].map(dir => (
              <button key={dir}
                onClick={() => setDisplay('layoutDirection', dir)}
                style={{
                  flex: 1, fontSize: 11,
                  background: state.display.layoutDirection === dir ? 'var(--accent)' : 'var(--bg-input)',
                  color: state.display.layoutDirection === dir ? 'var(--accent-text)' : 'var(--text-primary)',
                  borderColor: state.display.layoutDirection === dir ? 'var(--accent)' : 'var(--border)',
                }}>
                {dir === 'horizontal' ? '↔ Horizontal' : '↕ Vertical'}
              </button>
            ))}
          </div>

          {/* Projectors */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="section-title" style={{ margin: 0 }}>Projectors</span>
            <button onClick={addProjector} style={{ fontSize: 11, color: 'var(--accent)', borderColor: 'var(--accent)' }}>+ Add</button>
          </div>

          {state.projectors.map((p, i) => (
            <ProjectorCard key={i} projector={p} index={i}
              onUpdate={updateProjector}
              onUpdateBlend={updateProjectorBlend}
              onRemove={removeProjector}
              errors={{
                width:   errors[`p${i}width`],
                height:  errors[`p${i}height`],
                blendL:  errors[`p${i}blendL`],
                blendR:  errors[`p${i}blendR`],
                blendT:  errors[`p${i}blendT`],
                blendB:  errors[`p${i}blendB`],
              }}
            />
          ))}

          <div className="info-box">
            Total: <strong>{settings.outputWidth} × {settings.outputHeight} px</strong>
            <div style={{ fontSize: 10, marginTop: 2 }}>{state.projectors.length} projector{state.projectors.length !== 1 ? 's' : ''}</div>
          </div>

          {/* Display options */}
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

          <div className="field-row">
            <span className="field-label">Grid size</span>
            <input type="number" min="1" value={state.display.gridSize}
              onChange={e => setDisplay('gridSize', Number(e.target.value))}
              style={{ width: 60, borderColor: errors.gridSize ? 'var(--danger)' : undefined }} />
            <span className="field-unit">px</span>
          </div>
          {errors.gridSize && <div className="error-text">Must be at least 1</div>}

          <div className="section-title">Pattern</div>
          <select value={state.display.patternType} onChange={e => setDisplay('patternType', e.target.value)}
            style={{ width: '100%', marginBottom: 8, padding: '4px 6px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-primary)' }}>
            {['grid','dots','crosshatch','solid','gradient'].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>

          <div className="section-title">Colors</div>
          <ColorPicker label="Background" value={state.colors.background} onChange={v => setColor('background', v)} />
          <ColorPicker label="Pattern" value={state.colors.pattern} onChange={v => setColor('pattern', v)} />
          <ColorPicker label="Text" value={state.colors.text} onChange={v => setColor('text', v)} />
          <ColorPicker label="Blend zone" value={state.colors.blendZone} onChange={v => setColor('blendZone', v)} />
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
  state.projectors.forEach((p, i) => {
    if (p.width < 1) errors[`p${i}width`] = true
    if (p.height < 1) errors[`p${i}height`] = true
    if (p.blend.left < 0 || p.blend.left >= p.width) errors[`p${i}blendL`] = true
    if (p.blend.right < 0 || p.blend.right >= p.width) errors[`p${i}blendR`] = true
    if (p.blend.top < 0 || p.blend.top >= p.height) errors[`p${i}blendT`] = true
    if (p.blend.bottom < 0 || p.blend.bottom >= p.height) errors[`p${i}blendB`] = true
  })
  if (state.display.gridSize < 1) errors.gridSize = true
  return errors
}
```

- [ ] **Step 2: Verify Pixel Pattern Mode works end-to-end**

```bash
npm run dev
```
- Add 2–3 projectors. Set blend values. Toggle horizontal/vertical. Check canvas updates.
- Enable color bars. Verify SMPTE bars appear at top of canvas.
- Toggle blend zone overlay.

- [ ] **Step 3: Commit**

```bash
git add src/components/PixelPatternMode.jsx
git commit -m "feat: implement Pixel Pattern Mode UI with live canvas preview"
```

---

## Chunk 6: Integration + Build

### Task 18: Wire cross-mode preset import in App.jsx

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/MetricMode.jsx`
- Modify: `src/components/PixelPatternMode.jsx`

- [ ] **Step 1: Add `onNavigate` prop to MetricMode**

In `MetricMode.jsx`, add `onNavigate` to the function signature and update `handleImport`:

```jsx
// Change function signature:
export default function MetricMode({ onHome, onNavigate, initialPreset, theme, onThemeToggle }) {

// Replace handleImport:
  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const { preset, warningSkipped } = await readPresetFile(file)
      if (preset.mode === 'pixel') {
        onNavigate('pixel', preset)
        return
      }
      applyPreset(preset)
      if (warningSkipped) showToast('Some projectors had invalid data and were skipped.')
    } catch {
      showToast('Invalid preset file', true)
    }
    e.target.value = ''
  }
```

- [ ] **Step 2: Add `onNavigate` prop to PixelPatternMode**

In `PixelPatternMode.jsx`, add `onNavigate` to the function signature and update `handleImport`:

```jsx
// Change function signature:
export default function PixelPatternMode({ onHome, onNavigate, initialPreset, theme, onThemeToggle }) {

// Replace handleImport:
  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const { preset, warningSkipped } = await readPresetFile(file)
      if (preset.mode === 'metric') {
        onNavigate('metric', preset)
        return
      }
      applyPreset(preset)
      if (warningSkipped) showToast('Some projectors had invalid data and were skipped.')
    } catch {
      showToast('Invalid preset file', true)
    }
    e.target.value = ''
  }
```

- [ ] **Step 3: Update App.jsx to pass `onNavigate` to both modes, and clear `pendingPreset` on Home navigation**

`pendingPreset` must be cleared when the user navigates back to Home, otherwise a stale preset from a previous import will be re-applied the next time the user enters that mode manually.

In `App.jsx`, update both `onHome` handlers and the render blocks:

```jsx
      {view === 'metric' && (
        <MetricMode
          onHome={() => { setPendingPreset(null); setView('home') }}
          onNavigate={navigateTo}
          initialPreset={pendingPreset?.mode === 'metric' ? pendingPreset : null}
          theme={theme}
          onThemeToggle={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        />
      )}
      {view === 'pixel' && (
        <PixelPatternMode
          onHome={() => { setPendingPreset(null); setView('home') }}
          onNavigate={navigateTo}
          initialPreset={pendingPreset?.mode === 'pixel' ? pendingPreset : null}
          theme={theme}
          onThemeToggle={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        />
      )}
```

- [ ] **Step 4: Test cross-mode import**

Export a metric preset, then import it while in Pixel Pattern Mode. App should navigate to Metric Mode with the preset applied.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/MetricMode.jsx src/components/PixelPatternMode.jsx
git commit -m "feat: support cross-mode preset import with automatic navigation"
```

---

### Task 19: Production build + verification

**Files:**
- No new files

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 2: Build for production**

```bash
npm run build
```
Expected: `dist/` folder created, no errors.

- [ ] **Step 3: Preview production build**

```bash
npm run preview
```
Expected: App runs at `http://localhost:4173`.

Manual verification checklist:
- [ ] Metric Mode: change wall width → pixel output updates live
- [ ] Metric Mode: lock W button → changing meters does not change pixel W
- [ ] Metric Mode: Export PNG downloads a correctly-sized image
- [ ] Metric Mode: Export JSON, then reload page, home screen shows last preset shortcut
- [ ] Pixel Pattern Mode: add 3 projectors, set blend values → total px updates correctly
- [ ] Pixel Pattern Mode: toggle Horizontal / Vertical → canvas layout changes
- [ ] Pixel Pattern Mode: enable color bars → SMPTE bars visible at top of canvas
- [ ] Pixel Pattern Mode: Export PNG downloads a correctly-sized image
- [ ] Cross-mode import: export Metric JSON, import in Pixel Mode → app navigates to Metric Mode with preset applied
- [ ] Theme toggle: switch dark/light → persists on refresh
- [ ] Both modes: pattern type dropdown → canvas updates for each type

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: production build verified — Projection Test Pattern Generator complete"
```

---

## Running Tests

```bash
# All tests
npx vitest run

# Watch mode during development
npx vitest

# With UI
npx vitest --ui
```

Expected test files and coverage:
- `tests/utils/calculations.test.js` — 12 tests
- `tests/utils/presets.test.js` — 9 tests
- `tests/hooks/useMetricState.test.js` — 6 tests
- `tests/hooks/usePixelState.test.js` — 7 tests
