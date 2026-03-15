// src/utils/calculations.js

/**
 * Convert meters to pixels.
 * Formula: pixels = (meters / 0.0254) * dpi
 * 0.0254 meters = 1 inch, so dividing by 0.0254 gives inches, then multiply by dpi.
 */
export function metersToPixels(meters, dpi) {
  return Math.floor((meters / 0.0254) * dpi)
}

/**
 * Calculate total composite canvas size from an array of projectors.
 *
 * For 'horizontal' layout:
 *   - totalWidth = sum of each projector's width, minus the blend.right of every
 *     projector except the last (the last projector's right edge is the canvas edge).
 *   - totalHeight = max height across all projectors.
 *
 * For 'vertical' layout:
 *   - totalHeight = sum of each projector's height, minus the blend.bottom of every
 *     projector except the last.
 *   - totalWidth = max width across all projectors.
 *
 * @param {Array} projectors
 * @param {'horizontal'|'vertical'} direction
 * @returns {{ totalWidth: number, totalHeight: number }}
 */
export function calcPixelTotal(projectors, direction) {
  if (direction === 'horizontal') {
    const totalWidth = projectors.reduce((sum, p, i) => {
      return sum + p.width - (i < projectors.length - 1 ? p.blend.right : 0)
    }, 0)
    const totalHeight = Math.max(...projectors.map(p => p.height))
    return { totalWidth, totalHeight }
  } else {
    const totalHeight = projectors.reduce((sum, p, i) => {
      return sum + p.height - (i < projectors.length - 1 ? p.blend.bottom : 0)
    }, 0)
    const totalWidth = Math.max(...projectors.map(p => p.width))
    return { totalWidth, totalHeight }
  }
}

/**
 * Calculate the (x, y) origin of each projector in the composite canvas.
 *
 * Each projector starts where the previous one ended, accounting for blend overlap.
 * The cursor advances by (width - blend.right) in horizontal mode, or
 * (height - blend.bottom) in vertical mode.
 *
 * @param {Array} projectors
 * @param {'horizontal'|'vertical'} direction
 * @returns {Array<{ x: number, y: number }>}
 */
export function calcProjectorPositions(projectors, direction) {
  const positions = []
  let cursor = 0
  for (let i = 0; i < projectors.length; i++) {
    if (direction === 'horizontal') {
      positions.push({ x: cursor, y: 0 })
      cursor += projectors[i].width - projectors[i].blend.right
    } else {
      positions.push({ x: 0, y: cursor })
      cursor += projectors[i].height - projectors[i].blend.bottom
    }
  }
  return positions
}
