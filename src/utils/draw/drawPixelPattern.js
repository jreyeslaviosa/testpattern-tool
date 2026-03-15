// src/utils/draw/drawPixelPattern.js

const SMPTE_BARS = [
  '#c0c0c0','#c0c000','#00c0c0','#00c000','#c000c0','#c00000','#0000c0'
]

export function drawPixelPattern(ctx, settings) {
  const { outputWidth, outputHeight, projectors, positions, display, colors } = settings
  const { colorBars, showBlendZones, gridSize, patternType } = display

  // 1. Background
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, outputWidth, outputHeight)

  // 2. Color bars (10% height, min 40px)
  let patternTop = 0
  if (colorBars) {
    const barHeight = Math.max(40, Math.round(outputHeight * 0.1))
    const barWidth = outputWidth / 7
    SMPTE_BARS.forEach((color, i) => {
      ctx.fillStyle = color
      ctx.fillRect(Math.round(i * barWidth), 0, Math.round(barWidth), barHeight)
    })
    patternTop = barHeight
  }

  const patternHeight = outputHeight - patternTop

  // 3. Pattern across full composite canvas (below color bars)
  drawPattern(ctx, outputWidth, patternHeight, patternTop, gridSize, patternType, colors)

  // 4. Blend zone overlays
  if (showBlendZones) {
    ctx.globalAlpha = 0.3
    ctx.fillStyle = colors.blendZone
    projectors.forEach((p, i) => {
      const { x, y } = positions[i]
      if (p.blend.left > 0)   ctx.fillRect(x, 0, p.blend.left, outputHeight)
      if (p.blend.right > 0)  ctx.fillRect(x + p.width - p.blend.right, 0, p.blend.right, outputHeight)
      if (p.blend.top > 0)    ctx.fillRect(x, y, p.width, p.blend.top)
      if (p.blend.bottom > 0) ctx.fillRect(x, y + p.height - p.blend.bottom, p.width, p.blend.bottom)
    })
    ctx.globalAlpha = 1
  }

  // 5. Projector boundary lines
  ctx.strokeStyle = colors.pattern
  ctx.lineWidth = 1
  ctx.setLineDash([6, 4])
  projectors.forEach((p, i) => {
    const { x, y } = positions[i]
    ctx.strokeRect(x, y, p.width, p.height)
  })
  ctx.setLineDash([])

  // 6. Projector labels
  const labelSize = Math.max(12, Math.round(outputHeight * 0.02))
  ctx.font = `bold ${labelSize}px monospace`
  ctx.fillStyle = colors.text
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  projectors.forEach((p, i) => {
    const { x, y } = positions[i]
    const label = p.label || `P${i + 1}`
    ctx.fillText(label, x + 8, y + 8)
  })

  // 7. Canvas dimensions label
  ctx.font = `${Math.max(10, Math.round(outputHeight * 0.015))}px monospace`
  ctx.textBaseline = 'bottom'
  ctx.fillText(`${outputWidth}×${outputHeight}px total`, 10, outputHeight - 6)
}

function drawPattern(ctx, w, h, offsetY, interval, type, colors) {
  if (!interval || interval <= 0 || type === 'solid') return

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, offsetY, w, h)
  ctx.clip()

  ctx.strokeStyle = colors.pattern
  ctx.fillStyle = colors.pattern

  if (type === 'grid') {
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= w; x += interval) { ctx.moveTo(x, offsetY); ctx.lineTo(x, offsetY + h) }
    for (let y = offsetY + interval; y <= offsetY + h; y += interval) { ctx.moveTo(0, y); ctx.lineTo(w, y) }
    ctx.stroke()
  } else if (type === 'dots') {
    for (let x = 0; x <= w; x += interval) {
      for (let y = offsetY; y <= offsetY + h; y += interval) {
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill()
      }
    }
  } else if (type === 'crosshatch') {
    ctx.lineWidth = 1
    ctx.beginPath()
    const diag = Math.max(w, h) * 2
    for (let i = -diag; i <= diag; i += interval) {
      ctx.moveTo(i, offsetY); ctx.lineTo(i + h, offsetY + h)
      ctx.moveTo(i, offsetY); ctx.lineTo(i - h, offsetY + h)
    }
    ctx.stroke()
  } else if (type === 'gradient') {
    const hGrad = ctx.createLinearGradient(0, 0, w, 0)
    hGrad.addColorStop(0, colors.pattern)
    hGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = hGrad
    ctx.fillRect(0, offsetY, w, h)
    const vGrad = ctx.createLinearGradient(0, offsetY, 0, offsetY + h)
    vGrad.addColorStop(0, hexToRgba(colors.pattern, 0.5))
    vGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = vGrad
    ctx.fillRect(0, offsetY, w, h)
  }

  ctx.restore()
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
