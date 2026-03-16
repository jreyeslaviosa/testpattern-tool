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
          <div className="field-row" style={{ marginBottom: 4 }}>
            <span className="field-label">Line stroke</span>
            <input type="number" min="1" value={state.display.lineStroke}
              onChange={e => setDisplay('lineStroke', Number(e.target.value))}
              style={{ width: 55, ...inputStyle('lineStroke') }} />
            <span className="field-unit">px</span>
          </div>
          {errors.gridSize && <div className="error-text">Grid size must be ≥ 1</div>}
          {errors.textSize && <div className="error-text">Text size must be ≥ 8</div>}
          {errors.lineStroke && <div className="error-text">Line stroke must be ≥ 1</div>}

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
              <div className="field-row" style={{ marginBottom: 4 }}>
                <span className="field-label">Circle stroke</span>
                <input type="number" min="1" value={state.display.circleStroke}
                  onChange={e => setDisplay('circleStroke', Number(e.target.value))}
                  style={{ width: 55, ...inputStyle('circleStroke') }} />
                <span className="field-unit">px</span>
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
  if (!state.display.lineStroke || state.display.lineStroke < 1) errors.lineStroke = true
  if (!state.display.circleStroke || state.display.circleStroke < 1) errors.circleStroke = true
  return errors
}
