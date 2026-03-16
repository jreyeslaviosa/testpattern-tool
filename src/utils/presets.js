// src/utils/presets.js

const PIXEL_DISPLAY_DEFAULTS = {
  colorBars: false,
  showBlendZones: true,
  gridSize: 100,
  textSize: 14,
  patternType: 'grid',
  showCircles: true,
  title: '',
}

/**
 * migratePixelPreset: converts old projectors[] pixel preset to new grid format.
 * Returns { migrated, warningSkipped }.
 * Passes through unchanged if not pixel mode or already has grid.
 *
 * @param {unknown} raw
 * @returns {{ migrated: unknown, warningSkipped: boolean }}
 */
export function migratePixelPreset(raw) {
  if (!raw || typeof raw !== 'object') return { migrated: raw, warningSkipped: false }
  if (raw.mode !== 'pixel' || raw.grid) return { migrated: raw, warningSkipped: false }

  const projectors = Array.isArray(raw.projectors) ? raw.projectors : []
  if (projectors.length === 0) return { migrated: raw, warningSkipped: false }

  const p0 = projectors[0]
  const nonUniform = projectors.some(p => p.width !== p0.width || p.height !== p0.height)

  const { projectors: _proj, ...rest } = raw
  const { layoutDirection: _ld, ...displayRest } = rest.display || {}

  return {
    migrated: {
      ...rest,
      display: displayRest,
      grid: {
        rows: 1,
        cols: projectors.length,
        width: p0.width,
        height: p0.height,
        blendH: p0.blend?.right ?? 0,
        blendV: 0,
      },
    },
    warningSkipped: nonUniform,
  }
}

/**
 * Validate a preset object loaded from JSON or localStorage.
 *
 * Returns { valid: true, preset } on success, or { valid: false, error } on failure.
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
    const g = raw.grid
    if (!g || typeof g !== 'object') return { valid: false, error: 'Missing grid' }
    if (!Number.isInteger(g.rows) || g.rows < 1) return { valid: false, error: 'Invalid grid.rows' }
    if (!Number.isInteger(g.cols) || g.cols < 1) return { valid: false, error: 'Invalid grid.cols' }
    if (typeof g.width !== 'number' || g.width < 1) return { valid: false, error: 'Invalid grid.width' }
    if (typeof g.height !== 'number' || g.height < 1) return { valid: false, error: 'Invalid grid.height' }
    if (typeof g.blendH !== 'number' || g.blendH < 0 || g.blendH >= g.width) {
      return { valid: false, error: 'Invalid grid.blendH' }
    }
    if (typeof g.blendV !== 'number' || g.blendV < 0 || g.blendV >= g.height) {
      return { valid: false, error: 'Invalid grid.blendV' }
    }

    const allowedPatterns = ['grid', 'dots', 'crosshatch', 'solid', 'gradient', 'reference']
    const d = raw.display || {}
    if (d.patternType && !allowedPatterns.includes(d.patternType)) {
      return { valid: false, error: 'Invalid patternType' }
    }

    const display = { ...PIXEL_DISPLAY_DEFAULTS, ...d }
    return { valid: true, preset: { ...raw, display } }
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
 * Migrates old pixel format (projectors[]) to new grid format automatically.
 *
 * @returns {object|null}
 */
export function loadLastPreset() {
  try {
    const raw = localStorage.getItem('lastPreset')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const { migrated } = migratePixelPreset(parsed)
    return migrated
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
 * Migrates old pixel format (projectors[]) to new grid format automatically.
 *
 * @param {File} file
 * @returns {Promise<{ preset: object, warningSkipped?: boolean }>}
 */
export async function readPresetFile(file) {
  const text = await file.text()
  const raw = deserializePreset(text)
  if (!raw) throw new Error('Invalid preset file')
  const { migrated, warningSkipped: migrationWarning } = migratePixelPreset(raw)
  const result = validatePreset(migrated)
  if (!result.valid) throw new Error('Invalid preset file')
  return {
    preset: { ...result.preset, _filename: file.name },
    warningSkipped: result.warningSkipped || migrationWarning,
  }
}
