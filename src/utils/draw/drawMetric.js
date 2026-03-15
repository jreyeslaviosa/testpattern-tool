// src/utils/draw/drawMetric.js
// Full implementation in Task 9.

/**
 * Draw a metric test pattern onto a 2D canvas context.
 * The pattern is sized by outputWidth × outputHeight (pixels), with grid
 * subdivisions derived from real-world wall dimensions and DPI.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} settings
 */
export function drawMetric(ctx, settings) {
  const { outputWidth, outputHeight, colors } = settings
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, outputWidth, outputHeight)
  // Full implementation in Task 9
}
