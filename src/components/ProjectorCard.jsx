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
