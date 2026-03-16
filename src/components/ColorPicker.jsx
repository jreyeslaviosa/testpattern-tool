// src/components/ColorPicker.jsx
import { useState, useEffect } from 'react'

export default function ColorPicker({ label, value, onChange }) {
  const [text, setText] = useState(value)

  // Sync text field when value changes externally (e.g. preset load)
  useEffect(() => { setText(value) }, [value])

  function handleTextChange(e) {
    const raw = e.target.value
    setText(raw)
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) onChange(raw)
  }

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
        value={text}
        onChange={handleTextChange}
        onBlur={() => setText(value)}
        style={{ width: 72, fontFamily: 'monospace', fontSize: 11 }}
      />
    </div>
  )
}
