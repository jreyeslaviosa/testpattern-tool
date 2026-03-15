import '@testing-library/jest-dom'

// Node 22+ ships a built-in localStorage stub that lacks .clear(), .setItem(), etc.
// When vitest worker processes inherit the --localstorage-file flag without a path,
// globalThis.localStorage becomes that stub instead of jsdom's full Storage object.
// We replace it with a proper in-memory implementation so tests that use localStorage
// work correctly regardless of the Node.js version.
if (typeof localStorage === 'undefined' || typeof localStorage.clear !== 'function') {
  const store = new Map()
  const localStorageMock = {
    get length() { return store.size },
    clear() { store.clear() },
    getItem(key) { return store.has(key) ? store.get(key) : null },
    setItem(key, value) { store.set(key, String(value)) },
    removeItem(key) { store.delete(key) },
    key(index) { return [...store.keys()][index] ?? null },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  })
}
