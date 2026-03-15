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
