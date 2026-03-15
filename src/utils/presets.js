// src/utils/presets.js

/**
 * Validate a preset object loaded from JSON or localStorage.
 *
 * Returns { valid: true, preset } on success, or { valid: false, error } on failure.
 * For pixel mode, projectors that lack numeric width/height are silently filtered out;
 * if none remain the preset is rejected.
 *
 * @param {unknown} raw
 * @returns {{ valid: boolean, preset?: object, error?: string, warningSkipped?: boolean }}
 */
export function validatePreset(raw) {
  if (!raw || typeof raw !== 'object') return { valid: false, error: 'Not an object' }
  if (!raw.mode || !['metric', 'pixel'].includes(raw.mode)) {
    return { valid: false, error: 'Missing or invalid mode' }
  }

  if (raw.mode === 'metric') {
    if (!raw.wall || typeof raw.wall.width !== 'number' || typeof raw.wall.height !== 'number') {
      return { valid: false, error: 'Missing wall dimensions' }
    }
    return { valid: true, preset: raw }
  }

  if (raw.mode === 'pixel') {
    if (!Array.isArray(raw.projectors) || raw.projectors.length === 0) {
      return { valid: false, error: 'No projectors defined' }
    }
    const validProj = raw.projectors.filter(
      p => typeof p.width === 'number' && typeof p.height === 'number'
    )
    if (validProj.length === 0) {
      return { valid: false, error: 'No valid projectors after filtering' }
    }
    const skipped = validProj.length < raw.projectors.length
    const result = { valid: true, preset: { ...raw, projectors: validProj } }
    if (skipped) result.warningSkipped = true
    return result
  }

  return { valid: false, error: 'Unknown mode' }
}

/**
 * Serialize a preset state object to a pretty-printed JSON string.
 *
 * @param {object} state
 * @returns {string}
 */
export function serializePreset(state) {
  return JSON.stringify(state, null, 2)
}

/**
 * Deserialize a JSON string back to a preset object.
 * Returns null on parse failure rather than throwing.
 *
 * @param {string} json
 * @returns {object|null}
 */
export function deserializePreset(json) {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * Persist the current preset and its filename to localStorage so it can be
 * restored on the next session.
 *
 * @param {object} preset
 * @param {string} filename
 */
export function saveLastPreset(preset, filename) {
  try {
    localStorage.setItem('lastPreset', JSON.stringify({ ...preset, _filename: filename }))
  } catch {
    // localStorage may be unavailable (SSR, private browsing quota exceeded, etc.)
  }
}

/**
 * Load the most recently saved preset from localStorage.
 * Returns null if nothing is stored or if parsing fails.
 *
 * @returns {object|null}
 */
export function loadLastPreset() {
  try {
    const raw = localStorage.getItem('lastPreset')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Trigger a browser download of the preset as a JSON file and persist it to
 * localStorage as the last-used preset.
 *
 * Not testable in unit tests (requires DOM + Blob URL). Covered by integration tests.
 *
 * @param {object} state
 * @param {string} [filename]
 */
export function downloadPreset(state, filename = 'preset.json') {
  saveLastPreset(state, filename)
  const blob = new Blob([serializePreset(state)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Read a File object as text, parse it, and validate the resulting preset.
 * Throws if the file is not valid JSON or fails validation.
 *
 * @param {File} file
 * @returns {Promise<{ preset: object, warningSkipped?: boolean }>}
 */
export async function readPresetFile(file) {
  const text = await file.text()
  const raw = deserializePreset(text)
  if (!raw) throw new Error('Invalid preset file')
  const result = validatePreset(raw)
  if (!result.valid) throw new Error('Invalid preset file')
  return { preset: { ...result.preset, _filename: file.name }, warningSkipped: result.warningSkipped }
}
