// src/utils/draw/drawPixelPattern.js
// Full implementation in Task 10.

/**
 * Draw a pixel-pattern test pattern onto a 2D canvas context.
 * The canvas represents a composite of multiple projectors with optional
 * blend zone overlays and color bars.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} settings
 */
export function drawPixelPattern(ctx, settings) {
  const { outputWidth, outputHeight, colors } = settings
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, outputWidth, outputHeight)
  // Full implementation in Task 10
}
