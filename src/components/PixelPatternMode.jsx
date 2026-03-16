// src/components/PixelPatternMode.jsx
import { useRef, useState } from 'react'
import { usePixelState } from '../hooks/usePixelState'
import CanvasPreview from './CanvasPreview'
import ColorPicker from './ColorPicker'
import ProjectorCard from './ProjectorCard'
import ThemeToggle from './ThemeToggle'
import { downloadPreset, readPresetFile } from '../utils/presets'
import { exportPng } from '../utils/exportPng'

export default function PixelPatternMode({ onHome, onNavigate, initialPreset, theme, onThemeToggle }) {
  const {
    state, settings,
    addProjector, removeProjector, updateProjector, updateProjectorBlend,
    setDisplay, setColor, applyPreset,
  } = usePixelState(initialPreset)
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
