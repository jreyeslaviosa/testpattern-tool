// src/utils/draw/drawPixelPattern.js

const SMPTE_BARS = [
  '#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0',
]

export function drawPixelPattern(ctx, settings) {
  const { outputWidth: w, outputHeight: h, grid, positions, display, colors } = settings
  const { colorBars, showBlendZones, gridSize, textSize, patternType, lineStroke, circleStroke } = display
  const cellW = grid.width
  const cellH = grid.height

  // 1. Background
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, w, h)

  if (patternType === 'reference') {
    drawReferenceInner(ctx, w, h, cellW, cellH, grid, positions, display, colors, circleStroke, lineStroke)

    // 8. Color bars — centered overlay
    if (colorBars) {
      const barH = Math.round(w / 7)
      const barY = Math.round((h - barH) / 2)
      SMPTE_BARS.forEach((color, i) => {
        ctx.fillStyle = color
        ctx.fillRect(Math.round(i * w / 7), barY, Math.round(w / 7), barH)
      })
    }

    // 9. Blend zone overlays
    if (showBlendZones) {
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.fillStyle = colors.blendZone
      positions.forEach(({ x, y, col, row }) => {
        if (col > 0 && grid.blendH > 0)
          ctx.fillRect(x, y, grid.blendH, cellH)
        if (col < grid.cols - 1 && grid.blendH > 0)
          ctx.fillRect(x + cellW - grid.blendH, y, grid.blendH, cellH)
        if (row > 0 && grid.blendV > 0)
          ctx.fillRect(x, y, cellW, grid.blendV)
        if (row < grid.rows - 1 && grid.blendV > 0)
          ctx.fillRect(x, y + cellH - grid.blendV, cellW, grid.blendV)
      })
      ctx.restore()
    }
  } else {
    // 2. Pattern (full canvas)
    drawPattern(ctx, w, h, gridSize, patternType, colors, lineStroke)

    // 3. Color bars — centered overlay
    if (colorBars) {
      const barH = Math.round(w / 7)
      const barY = Math.round((h - barH) / 2)
      SMPTE_BARS.forEach((color, i) => {
        ctx.fillStyle = color
        ctx.fillRect(Math.round(i * w / 7), barY, Math.round(w / 7), barH)
      })
    }

    // 4. Blend zone overlays
    if (showBlendZones) {
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.fillStyle = colors.blendZone
      positions.forEach(({ x, y, col, row }) => {
        if (col > 0 && grid.blendH > 0)
          ctx.fillRect(x, y, grid.blendH, cellH)
        if (col < grid.cols - 1 && grid.blendH > 0)
          ctx.fillRect(x + cellW - grid.blendH, y, grid.blendH, cellH)
        if (row > 0 && grid.blendV > 0)
          ctx.fillRect(x, y, cellW, grid.blendV)
        if (row < grid.rows - 1 && grid.blendV > 0)
          ctx.fillRect(x, y + cellH - grid.blendV, cellW, grid.blendV)
      })
      ctx.restore()
    }

    // 5. Cell boundary dashes
    ctx.strokeStyle = colors.pattern
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    positions.forEach(({ x, y }) => ctx.strokeRect(x, y, cellW, cellH))
    ctx.setLineDash([])

    // 6. Cell labels (col+1, row+1) at top-left of each cell
    const lblSize = Math.max(10, Math.round(cellH * 0.02))
    ctx.font = `bold ${lblSize}px monospace`
    ctx.fillStyle = colors.text
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    positions.forEach(({ x, y, col, row }) => {
      ctx.fillText(`${col + 1},${row + 1}`, x + 8, y + 8)
    })

    // 7. Total dimensions label (bottom-left)
    ctx.font = `${Math.max(10, Math.round(h * 0.015))}px monospace`
    ctx.textBaseline = 'bottom'
    ctx.fillText(`${w}×${h}px total`, 10, h - 6)
  }
}

function drawReferenceInner(ctx, w, h, cellW, cellH, grid, positions, display, colors, circleStroke = 2, lineStroke = 1) {
  const { gridSize, textSize, showCircles, title } = display
  const { cols, rows, blendH, blendV } = grid

  // Layer 2: Grid lines
  drawPattern(ctx, w, h, gridSize, 'grid', colors, lineStroke)

  // Layer 3: Inscribed circles
  if (showCircles) {
    const radius = Math.floor(Math.min(cellW, cellH) / 2) - 10
    if (radius > 0) {
      ctx.strokeStyle = colors.pattern
      ctx.lineWidth = circleStroke
      positions.forEach(({ x, y }) => {
        ctx.beginPath()
        ctx.arc(x + cellW / 2, y + cellH / 2, radius, 0, Math.PI * 2)
        ctx.stroke()
      })
    }
  }

  // Layer 4: Center crosshair
  ctx.strokeStyle = colors.pattern
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2)
  ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h)
  ctx.stroke()

  // Layer 5: Edge labels
  ctx.font = textSize + 'px monospace'
  ctx.fillStyle = colors.text

  // Column numbers (omit all when cell too narrow)
  if (cellW >= 2 * textSize) {
    ctx.textAlign = 'center'
    for (let col = 0; col < cols; col++) {
      const lx = col * (cellW - blendH) + cellW / 2
      ctx.textBaseline = 'top'
      ctx.fillText(String(col + 1), lx, 4)
      ctx.textBaseline = 'bottom'
      ctx.fillText(String(col + 1), lx, h - 4)
    }
  }

  // Row letters A–Z (omit all when rows > 26)
  if (rows <= 26) {
    ctx.textBaseline = 'middle'
    for (let row = 0; row < rows; row++) {
      const ly = row * (cellH - blendV) + cellH / 2
      const letter = String.fromCharCode(65 + row)
      ctx.textAlign = 'left';  ctx.fillText(letter, 4, ly)
      ctx.textAlign = 'right'; ctx.fillText(letter, w - 4, ly)
    }
  }

  // Layer 6: Title
  if (title) {
    ctx.font = Math.round(textSize * 3) + 'px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = colors.text
    ctx.fillText(title, w / 2, h / 2)
  }

  // Layer 7: Info text (below title)
  const ratio = (w / h).toFixed(2)
  ctx.font = Math.round(textSize * 1.2) + 'px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = colors.text
  ctx.fillText(
    `${w}×${h}px  ·  ${ratio}:1  ·  ${cols}×${rows} cells`,
    w / 2,
    h / 2 + Math.round(textSize * 3 / 2) + 8
  )
}

function drawPattern(ctx, w, h, interval, type, colors, lineStroke = 1) {
  if (!interval || interval <= 0 || type === 'solid') return

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w, h)
  ctx.clip()

  ctx.strokeStyle = colors.pattern
  ctx.fillStyle = colors.pattern

  if (type === 'grid') {
    ctx.lineWidth = lineStroke
    ctx.beginPath()
    for (let x = 0; x <= w; x += interval) { ctx.moveTo(x, 0); ctx.lineTo(x, h) }
    for (let y = 0; y <= h; y += interval) { ctx.moveTo(0, y); ctx.lineTo(w, y) }
    ctx.stroke()
  } else if (type === 'dots') {
    for (let x = 0; x <= w; x += interval) {
      for (let y = 0; y <= h; y += interval) {
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill()
      }
    }
  } else if (type === 'crosshatch') {
    ctx.lineWidth = lineStroke
    ctx.beginPath()
    const diag = Math.max(w, h) * 2
    for (let i = -diag; i <= diag; i += interval) {
      ctx.moveTo(i, 0); ctx.lineTo(i + h, h)
      ctx.moveTo(i, 0); ctx.lineTo(i - h, h)
    }
    ctx.stroke()
  } else if (type === 'gradient') {
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

  ctx.restore()
}

function hexToRgba(hex, alpha) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return `rgba(0,0,0,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
