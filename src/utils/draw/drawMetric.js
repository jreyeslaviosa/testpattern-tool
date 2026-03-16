// src/utils/draw/drawMetric.js

export function drawMetric(ctx, settings) {
  const {
    outputWidth: w, outputHeight: h,
    gridInterval, patternType, colors,
    wall, gridSubdivision,
    lineStroke = 1,
    title = '',
  } = settings

  // 1. Background
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, w, h)

  // 2. Border
  ctx.strokeStyle = colors.border
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, w - 2, h - 2)

  if (patternType === 'reference') {
    drawMetricReference(ctx, w, h, gridInterval, gridSubdivision, lineStroke, title, settings)
    return
  }

  // 3. Pattern
  drawPattern(ctx, w, h, gridInterval, patternType, colors, lineStroke)

  // 4. Registration marks (corners + center)
  drawRegistrationMarks(ctx, w, h, colors.pattern)

  // 5. Dimension label
  ctx.fillStyle = colors.text
  ctx.font = `${Math.max(12, Math.round(h * 0.018))}px monospace`
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'left'
  ctx.fillText(
    `${wall.width}m × ${wall.height}m  ·  ${gridSubdivision}m/grid  ·  ${w}×${h}px`,
    10, h - 8
  )
}

function drawMetricReference(ctx, w, h, gridInterval, gridSubdivision, lineStroke, title, settings) {
  const { colors, wall } = settings
  const textSize = Math.max(10, Math.round(h * 0.015))

  // Grid lines
  drawPattern(ctx, w, h, gridInterval, 'grid', colors, lineStroke)

  // Center crosshair (full width/height)
  ctx.strokeStyle = colors.pattern
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2)
  ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h)
  ctx.stroke()

  // Ruler labels
  ctx.fillStyle = colors.text
  ctx.font = textSize + 'px monospace'

  // Top edge: meter values at each vertical grid line
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let i = 0; i * gridInterval <= w + 1; i++) {
    const x = i * gridInterval
    const val = +(i * gridSubdivision).toFixed(3)
    if (val > wall.width + 0.001) break
    ctx.fillText(`${val}m`, x, 4)
  }

  // Left edge: meter values at each horizontal grid line
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  for (let j = 0; j * gridInterval <= h + 1; j++) {
    const y = j * gridInterval
    const val = +(j * gridSubdivision).toFixed(3)
    if (val > wall.height + 0.001) break
    ctx.fillText(`${val}m`, 4, y)
  }

  // Title
  if (title) {
    ctx.font = Math.round(textSize * 2.5) + 'px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = colors.text
    ctx.fillText(title, w / 2, h / 2)
  }

  // Info text (below title or at center)
  const ratio = (w / h).toFixed(2)
  const infoY = title
    ? h / 2 + Math.round(textSize * 2.5 / 2) + 8
    : h / 2 + textSize + 4
  ctx.font = Math.round(textSize * 1.2) + 'px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = colors.text
  ctx.fillText(`${wall.width}m × ${wall.height}m  ·  ${w}×${h}px  ·  ${ratio}:1`, w / 2, infoY)
}

function drawPattern(ctx, w, h, interval, type, colors, lineStroke = 1) {
  if (!interval || interval <= 0) return
  ctx.strokeStyle = colors.pattern
  ctx.fillStyle = colors.pattern

  if (type === 'solid') return

  if (type === 'grid') {
    ctx.lineWidth = lineStroke
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
    ctx.lineWidth = lineStroke
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
