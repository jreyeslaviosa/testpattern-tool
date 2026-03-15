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
