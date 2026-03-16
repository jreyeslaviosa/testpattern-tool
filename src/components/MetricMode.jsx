// src/components/MetricMode.jsx
import { useRef, useState } from 'react'
import { useMetricState } from '../hooks/useMetricState'
import CanvasPreview from './CanvasPreview'
import ColorPicker from './ColorPicker'
import ThemeToggle from './ThemeToggle'
import { downloadPreset, readPresetFile } from '../utils/presets'
import { exportPng } from '../utils/exportPng'
import PresetManager from './PresetManager'

export default function MetricMode({ onHome, onNavigate, initialPreset, theme, onThemeToggle }) {
  const { state, settings, setWall, setResolution, setGridSubdivision, setPatternType, setColor, toggleLock, setLockPixels, setField, applyPreset } = useMetricState(initialPreset)
  const [toast, setToast] = useState(null)
  const [exportScale, setExportScale] = useState(1)
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
      if (preset.mode === 'pixel') {
        e.target.value = ''
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

  function handleExport() {
    downloadPreset(state, `metric-${state.wall.width}x${state.wall.height}.json`)
  }

  async function handleExportPng() {
    if (hasErrors) return
    await exportPng(settings, `pattern-${settings.outputWidth}x${settings.outputHeight}.png`, exportScale)
  }

  const arActive = state.lock.aspectRatio

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
          <select value={exportScale} onChange={e => setExportScale(Number(e.target.value))}
            style={{ padding: '3px 4px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-primary)', fontSize: 11 }}>
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
          </select>
          <button className="btn-primary" onClick={handleExportPng} disabled={hasErrors}>Export PNG</button>
        </div>
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel */}
        <aside style={{
          width: 240, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)',
          padding: 12, overflowY: 'auto', flexShrink: 0
        }}>
          <PresetManager state={state} onLoad={applyPreset} mode="metric" />
          <div className="section-title">Wall Dimensions</div>

          <DimField
            label="Width" value={state.wall.width} locked={state.lock.width}
            pixelValue={state.lock.pixelWidth}
            computedPixels={Math.floor(state.wall.width * state.resolution)}
            onLock={() => toggleLock('width')} onChange={v => setWall('width', v)}
            onPixelChange={v => setLockPixels('width', v)}
            error={errors.width}
          />
          <DimField
            label="Height" value={state.wall.height} locked={state.lock.height}
            pixelValue={state.lock.pixelHeight}
            computedPixels={Math.floor(state.wall.height * state.resolution)}
            onLock={() => toggleLock('height')} onChange={v => setWall('height', v)}
            onPixelChange={v => setLockPixels('height', v)}
            error={errors.height}
          />

          {/* Aspect ratio lock */}
          <div style={{ marginBottom: 8 }}>
            <button
              onClick={() => toggleLock('aspectRatio')}
              style={{
                width: '100%', fontSize: 11, padding: '3px 0',
                background: arActive ? 'var(--accent)' : 'var(--bg-input)',
                color: arActive ? 'var(--accent-text)' : 'var(--text-primary)',
                borderColor: arActive ? 'var(--accent)' : 'var(--border)',
              }}
            >
              {arActive
                ? `🔗 AR locked  ${(state.wall.width / state.wall.height).toFixed(2)}:1`
                : '🔗 Lock aspect ratio'}
            </button>
          </div>

          {/* Resolution */}
          <div className="field-row" style={{ marginBottom: 5 }}>
            <span className="field-label">Resolution</span>
            <input type="number" min="1" value={state.resolution}
              onChange={e => setResolution(Number(e.target.value))}
              style={{ width: 70 }} />
            <span className="field-unit">px/m</span>
          </div>
          {errors.resolution && <span className="error-text">{errors.resolution}</span>}

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

          <div className="field-row" style={{ marginBottom: 4 }}>
            <span className="field-label">Line stroke</span>
            <input type="number" min="1" value={state.lineStroke || 1}
              onChange={e => setField('lineStroke', Number(e.target.value))}
              style={{ width: 55 }} />
            <span className="field-unit">px</span>
          </div>
          {errors.lineStroke && <div className="error-text">{errors.lineStroke}</div>}

          <div className="section-title">Pattern</div>
          <select value={state.patternType} onChange={e => setPatternType(e.target.value)}
            style={{ width: '100%', marginBottom: 8, padding: '4px 6px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-primary)' }}>
            {['grid','dots','crosshatch','solid','gradient','reference'].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>

          {state.patternType === 'reference' && (
            <>
              <div className="section-title">Reference</div>
              <div className="field-row" style={{ marginBottom: 5 }}>
                <span className="field-label">Title</span>
                <input type="text" value={state.title || ''}
                  onChange={e => setField('title', e.target.value)}
                  placeholder="Pattern name…"
                  style={{ flex: 1 }} />
              </div>
            </>
          )}

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

function DimField({ label, value, locked, pixelValue, computedPixels, onLock, onChange, onPixelChange, error }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div className="field-row">
        <span className="field-label">{label}</span>
        <input type="number" min="0.01" step="0.1" value={value}
          onChange={e => onChange(Number(e.target.value))} style={{ width: 80 }} />
        <span className="field-unit">m</span>
        <button onClick={onLock} title={locked ? 'Unlock' : 'Lock px'}
          style={{ padding: '2px 6px', color: locked ? 'var(--accent)' : 'var(--text-secondary)', borderColor: locked ? 'var(--accent)' : 'var(--border)' }}>
          {locked ? '🔒' : '🔓'}
        </button>
      </div>
      {locked ? (
        <div className="field-row" style={{ marginTop: 2 }}>
          <span className="field-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>px lock</span>
          <input type="number" min="1" value={pixelValue || ''}
            onChange={e => onPixelChange(Number(e.target.value))}
            style={{ width: 80 }} />
          <span className="field-unit">px</span>
        </div>
      ) : (
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', paddingLeft: 2, marginTop: 1 }}>
          → {computedPixels} px
        </div>
      )}
      {error && <div className="error-text">{error}</div>}
    </div>
  )
}

function validate(state) {
  const errors = {}
  if (!state.wall.width || state.wall.width <= 0) errors.width = 'Must be greater than 0'
  if (!state.wall.height || state.wall.height <= 0) errors.height = 'Must be greater than 0'
  if (!state.resolution || state.resolution < 1) errors.resolution = 'Must be at least 1'
  if (!state.gridSubdivision || state.gridSubdivision <= 0 || state.gridSubdivision > Math.min(state.wall.width, state.wall.height)) {
    errors.grid = 'Must be between 0 and the smaller wall dimension'
  }
  if (!state.lineStroke || state.lineStroke < 1) errors.lineStroke = 'Must be at least 1'
  return errors
}
