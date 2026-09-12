/**
 * components/LiveFeed.jsx
 * Canvas-based live detection frame renderer with bounding boxes
 */
import { useRef, useEffect } from 'react'

function drawFrame(canvas, frameData) {
  const ctx = canvas.getContext('2d')
  const { count = 0, detections = [], inference_ms = 0, frame_idx = 0, frame_b64 } = frameData

  const W = canvas.width
  const H = canvas.height

  const finish = () => {
    drawDetections(ctx, detections, W, H)
    drawHUD(ctx, count, inference_ms, frame_idx, W, H)
  }

  if (frame_b64) {
    const img = new Image()
    img.onload = () => {
      canvas.width  = img.naturalWidth || 1280
      canvas.height = img.naturalHeight || 720
      ctx.drawImage(img, 0, 0)
      finish()
    }
    img.src = 'data:image/jpeg;base64,' + frame_b64
  } else {
    drawPlaceholder(ctx, W, H, count, inference_ms, frame_idx)
  }
}

function drawPlaceholder(ctx, W, H, count, ms, frameIdx) {
  // Dark background
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#0d1018'); grad.addColorStop(1, '#080b10')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.025)'; ctx.lineWidth = 1
  for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
  for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

  // Belt
  ctx.fillStyle = 'rgba(50,44,62,0.45)'; ctx.fillRect(0, H * 0.35, W, H * 0.4)

  // Counting line
  ctx.strokeStyle = '#00e8a0'; ctx.lineWidth = 2
  ctx.setLineDash([12, 6])
  ctx.beginPath(); ctx.moveTo(0, H * 0.6); ctx.lineTo(W, H * 0.6); ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#00e8a0'; ctx.font = 'bold 12px JetBrains Mono, monospace'
  ctx.fillText('COUNTING LINE', 12, H * 0.6 - 8)

  // Draw bottles
  for (let i = 0; i < count; i++) {
    const x = ((i * (W / (count + 1))) + W / (count + 1) + (frameIdx * 2.5)) % W
    drawBottle(ctx, x, H * 0.42)
  }

  drawHUD(ctx, count, ms, frameIdx, W, H)
}

function drawBottle(ctx, cx, cy) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 136, 26, 8, 0, 0, Math.PI * 2)
  ctx.fill()

  // Body
  ctx.fillStyle = '#8fc8e8'; ctx.fillRect(cx - 22, cy + 20, 44, 100)
  ctx.fillStyle = '#aad8f0'; ctx.fillRect(cx - 17, cy + 20, 10, 100)
  // Neck
  ctx.fillStyle = '#9dd5f0'; ctx.fillRect(cx - 12, cy - 20, 24, 42)
  // Cap
  ctx.fillStyle = '#e05a45'; ctx.fillRect(cx - 16, cy - 38, 32, 20)
  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(cx - 16, cy + 35, 32, 55)
  ctx.fillStyle = '#1a2a40'; ctx.font = 'bold 9px Inter,sans-serif'; ctx.textAlign = 'center'
  ctx.fillText('MILK', cx, cy + 55)
  ctx.fillText('500ml', cx, cy + 68)
  ctx.textAlign = 'left'

  // Bounding box
  ctx.strokeStyle = '#00e8a0'; ctx.lineWidth = 2
  ctx.strokeRect(cx - 28, cy - 40, 56, 172)
  // Label bg
  ctx.fillStyle = '#00966a'; ctx.fillRect(cx - 28, cy - 62, 88, 22)
  ctx.fillStyle = 'white'; ctx.font = 'bold 12px Inter,sans-serif'
  ctx.fillText('bottle 97%', cx - 24, cy - 45)
}

function drawDetections(ctx, detections, W, H) {
  const sx = W / 1280, sy = H / 720
  for (const det of detections) {
    const [x1, y1, x2, y2] = det.bbox
    const cx1 = x1 * sx, cy1 = y1 * sy, cw = (x2 - x1) * sx, ch = (y2 - y1) * sy
    ctx.strokeStyle = '#00e8a0'; ctx.lineWidth = 2.5
    ctx.strokeRect(cx1, cy1, cw, ch)
    const label = `bottle ${(det.confidence * 100).toFixed(0)}%`
    ctx.font = 'bold 13px Inter,sans-serif'
    const tw = ctx.measureText(label).width
    ctx.fillStyle = '#00966a'; ctx.fillRect(cx1, cy1 - 22, tw + 10, 22)
    ctx.fillStyle = '#fff'; ctx.fillText(label, cx1 + 5, cy1 - 5)
  }
  // Count line
  ctx.strokeStyle = '#00e8a0'; ctx.lineWidth = 2
  ctx.setLineDash([12, 6])
  ctx.beginPath(); ctx.moveTo(0, H * 0.6); ctx.lineTo(W, H * 0.6); ctx.stroke()
  ctx.setLineDash([])
}

function drawHUD(ctx, count, ms, frameIdx, W, H) {
  ctx.fillStyle = 'rgba(0,232,160,0.85)'; ctx.font = 'bold 16px Inter,sans-serif'
  ctx.fillText('🥛 Milkyway AI', 16, 36)
  ctx.fillStyle = 'rgba(139,147,172,0.8)'; ctx.font = '12px JetBrains Mono,monospace'
  ctx.fillText(`${ms.toFixed(0)}ms | ${count} bottles | frame ${frameIdx}`, 16, 58)
}

export function LiveFeed({ frameData }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !frameData) return
    drawFrame(canvasRef.current, frameData)
  }, [frameData])

  return (
    <div style={{
      position: 'relative', borderRadius: '12px', overflow: 'hidden',
      background: '#080b10', aspectRatio: '16/9',
    }}>
      <canvas
        ref={canvasRef}
        width={1280} height={720}
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
      />
    </div>
  )
}
