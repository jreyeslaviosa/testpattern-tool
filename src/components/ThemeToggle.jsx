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
