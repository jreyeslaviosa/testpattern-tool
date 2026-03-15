// src/utils/draw/drawMetric.js

export function drawMetric(ctx, settings) {
  const { outputWidth, outputHeight, gridInterval, patternType, colors, wall, gridSubdivision } = settings

  // 1. Background
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, outputWidth, outputHeight)

  // 2. Border
  ctx.strokeStyle = colors.border
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, outputWidth - 2, outputHeight - 2)

  // 3. Pattern
  drawPattern(ctx, outputWidth, outputHeight, gridInterval, patternType, colors)

  // 4. Registration marks (corners + center)
  drawRegistrationMarks(ctx, outputWidth, outputHeight, colors.pattern)

  // 5. Dimension label
  ctx.fillStyle = colors.text
  ctx.font = `${Math.max(12, Math.round(outputHeight * 0.018))}px monospace`
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'left'
  ctx.fillText(
    `${wall.width}m × ${wall.height}m  ·  ${gridSubdivision}m/grid  ·  ${outputWidth}×${outputHeight}px`,
    10, outputHeight - 8
  )
}

function drawPattern(ctx, w, h, interval, type, colors) {
  if (!interval || interval <= 0) return
  ctx.strokeStyle = colors.pattern
  ctx.fillStyle = colors.pattern

  if (type === 'solid') return

  if (type === 'grid') {
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= w; x += interval) { ctx.moveTo(x, 0); ctx.lineTo(x, h) }
    for (let y = 0; y <= h; y += interval) { ctx.moveTo(0, y); ctx.lineTo(w, y) }
    ctx.stroke()
    return
  }

  if (type === 'dots') {
    for (let x = 0; x <= w; x += interval) {
      for (let y = 0; y <= h; y += interval) {
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill()
      }
    }
    return
  }

  if (type === 'crosshatch') {
    ctx.lineWidth = 1
    ctx.beginPath()
    const diag = Math.max(w, h) * 2
    for (let i = -diag; i <= diag; i += interval) {
      ctx.moveTo(i, 0); ctx.lineTo(i + h, h)
      ctx.moveTo(i, 0); ctx.lineTo(i - h, h)
    }
    ctx.stroke()
    return
  }

  if (type === 'gradient') {
    const hGrad = ctx.createLinearGradient(0, 0, w, 0)
    hGrad.addColorStop(0, colors.pattern)
    hGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = hGrad
    ctx.fillRect(0, 0, w, h)

    const vGrad = ctx.createLinearGradient(0, 0, 0, h)
    vGrad.addColorStop(0, hexToRgba(colors.pattern, 0.5))
    vGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = vGrad
    ctx.fillRect(0, 0, w, h)
  }
}

function drawRegistrationMarks(ctx, w, h, color) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  const size = Math.min(w, h) * 0.03

  const corners = [[0, 0], [w, 0], [w, h], [0, h]]
  corners.forEach(([cx, cy]) => {
    const dx = cx === 0 ? 1 : -1
    const dy = cy === 0 ? 1 : -1
    ctx.beginPath()
    ctx.moveTo(cx + dx * size, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * size)
    ctx.stroke()
  })

  // Center crosshair
  const mx = w / 2, my = h / 2
  ctx.beginPath()
  ctx.moveTo(mx - size, my); ctx.lineTo(mx + size, my)
  ctx.moveTo(mx, my - size); ctx.lineTo(mx, my + size)
  ctx.stroke()
}

function hexToRgba(hex, alpha) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return `rgba(0,0,0,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
