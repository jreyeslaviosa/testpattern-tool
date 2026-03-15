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
    </div>
  )
}
