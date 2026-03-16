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
 * Calculate total composite canvas size from a projector grid.
 *
 * totalWidth  = cols * width  - (cols - 1) * blendH
 * totalHeight = rows * height - (rows - 1) * blendV
 *
 * @param {{ rows: number, cols: number, width: number, height: number, blendH: number, blendV: number }} grid
 * @returns {{ totalWidth: number, totalHeight: number }}
 */
export function calcGridTotal(grid) {
  const totalWidth  = grid.cols * grid.width  - (grid.cols - 1) * grid.blendH
  const totalHeight = grid.rows * grid.height - (grid.rows - 1) * grid.blendV
  return { totalWidth, totalHeight }
}

/**
 * Calculate the (x, y) origin of each projector cell in the composite canvas.
 *
 * Returns a flat row-major array of { x, y, col, row } objects (0-indexed).
 *
 * x = col * (width  - blendH)
 * y = row * (height - blendV)
 *
 * @param {{ rows: number, cols: number, width: number, height: number, blendH: number, blendV: number }} grid
 * @returns {Array<{ x: number, y: number, col: number, row: number }>}
 */
export function calcGridPositions(grid) {
  const positions = []
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      positions.push({
        x: col * (grid.width  - grid.blendH),
        y: row * (grid.height - grid.blendV),
        col,
        row,
      })
    }
  }
  return positions
}
