// src/components/PresetManager.jsx
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'presets_v1'

function loadPresets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function savePresets(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {}
}

/**
 * PresetManager: a compact panel section showing saved presets.
 *
 * Props:
 *   state      — current full state object to save
 *   onLoad     — called with the saved state data when user clicks Load
 *   mode       — 'metric' | 'pixel' (filters preset list to same mode)
 */
export default function PresetManager({ state, onLoad, mode }) {
  const [presets, setPresets] = useState(loadPresets)
  const [name, setName] = useState('')
  const [expanded, setExpanded] = useState(false)

  // Reload from localStorage when panel is opened
  useEffect(() => {
    if (expanded) setPresets(loadPresets())
  }, [expanded])

  const modePresets = presets.filter(p => p.data?.mode === mode)

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    const entry = {
      id: String(Date.now()),
      name: trimmed,
      data: state,
      savedAt: Date.now(),
    }
    const updated = [entry, ...presets]
    setPresets(updated)
    savePresets(updated)
    setName('')
  }

  function handleLoad(entry) {
    onLoad(entry.data)
  }

  function handleDelete(id) {
    const updated = presets.filter(p => p.id !== id)
    setPresets(updated)
    savePresets(updated)
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', fontSize: 11, padding: '3px 0',
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 3,
          color: 'var(--text-primary)',
          textAlign: 'left',
          paddingLeft: 8,
        }}
      >
        {expanded ? '▾' : '▸'} Presets {modePresets.length > 0 ? `(${modePresets.length})` : ''}
      </button>

      {expanded && (
        <div style={{ marginTop: 6 }}>
          {/* Save current */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Preset name…"
              style={{ flex: 1, fontSize: 11 }}
            />
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              style={{ fontSize: 11, padding: '2px 8px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
            >
              Save
            </button>
          </div>

          {/* Saved list */}
          {modePresets.length === 0 ? (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', paddingLeft: 2 }}>No saved presets</div>
          ) : (
            modePresets.map(entry => (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                marginBottom: 3, padding: '2px 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{
                  flex: 1, fontSize: 11, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: 'var(--text-primary)',
                }}>
                  {entry.name}
                </span>
                <button
                  onClick={() => handleLoad(entry)}
                  style={{ fontSize: 10, padding: '1px 6px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                >
                  Load
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  style={{ fontSize: 10, padding: '1px 6px', color: 'var(--danger, #ef4444)', borderColor: 'var(--danger, #ef4444)' }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
