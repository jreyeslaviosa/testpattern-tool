// src/utils/exportPng.js
import { drawMetric } from './draw/drawMetric'
import { drawPixelPattern } from './draw/drawPixelPattern'

/**
 * Render a test pattern to an OffscreenCanvas and trigger a PNG download.
 *
 * Uses OffscreenCanvas so the export can be called from any context without
 * touching the live preview canvas. The draw functions are the same ones used
 * for the on-screen preview, guaranteeing what-you-see-is-what-you-export.
 *
 * @param {object} settings  - Full state for the active mode (metric or pixel).
 *   Required keys: mode ('metric'|'pixel'), outputWidth (px), outputHeight (px), colors.
 * @param {string} [filename] - Download filename, defaults to 'pattern.png'.
 * @returns {Promise<void>}
 */
export async function exportPng(settings, filename = 'pattern.png') {
  const { outputWidth, outputHeight } = settings
  const offscreen = new OffscreenCanvas(outputWidth, outputHeight)
  const ctx = offscreen.getContext('2d')

  if (settings.mode === 'metric') {
    drawMetric(ctx, settings)
  } else {
    drawPixelPattern(ctx, settings)
  }

  const blob = await offscreen.convertToBlob({ type: 'image/png' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
