/**
 * stream.js — WebSocket live stream handler for Milkyway AI dashboard
 * Handles frame rendering on canvas + detection box overlay
 */

let ws = null;
let streamMode = 'demo';   // 'demo' | 'camera'
let lastFrameIdx = -1;
let totalCounted = 0;

const canvas  = document.getElementById('live-canvas');
const ctx2d   = canvas ? canvas.getContext('2d') : null;

/* ── Connect WebSocket ──────────────────────────────────────────────────── */
function connectStream(mode = 'demo') {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  streamMode = mode;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${location.host}/ws/stream?demo=${mode === 'demo'}`;

  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log(`[Milkyway] WebSocket connected (${mode})`);
    updateConnectionBadge(true);
    showToast(`Stream connected — ${mode} mode`, 'success');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.error) {
        showToast(data.error, 'error');
        return;
      }
      handleFrame(data);
    } catch (e) {
      console.warn('[Milkyway] Frame parse error:', e);
    }
  };

  ws.onerror = (err) => {
    console.error('[Milkyway] WebSocket error:', err);
    updateConnectionBadge(false);
  };

  ws.onclose = () => {
    console.log('[Milkyway] WebSocket closed');
    updateConnectionBadge(false);
  };
}

/* ── Handle incoming frame ──────────────────────────────────────────────── */
function handleFrame(data) {
  const count        = data.count || 0;
  const detections   = data.detections || [];
  const inferenceMs  = data.inference_ms || 0;
  const frameIdx     = data.frame_idx || 0;
  const frameB64     = data.frame_b64;
  const alerts       = data.alerts || [];
  totalCounted       = data.total_counted || totalCounted;

  // Update KPIs
  updateEl('kpi-count', count);
  updateEl('kpi-total', totalCounted.toLocaleString());
  updateEl('kpi-fps', `${inferenceMs.toFixed(0)}`);
  updateEl('feed-fps-stat', `${inferenceMs.toFixed(0)} ms`);
  updateEl('feed-frame-stat', `Frame ${frameIdx}`);
  updateEl('feed-count-badge', `${count} bottle${count !== 1 ? 's' : ''}`);
  updateEl('counter-big', totalCounted.toLocaleString());

  // Update live chart
  pushLiveCount(count);

  // Render frame on canvas
  if (frameB64 && ctx2d) {
    const img = new Image();
    img.onload = () => {
      canvas.width  = img.naturalWidth  || 1280;
      canvas.height = img.naturalHeight || 720;
      ctx2d.drawImage(img, 0, 0);
      drawDetections(detections);
    };
    img.src = 'data:image/jpeg;base64,' + frameB64;
  } else if (ctx2d) {
    drawPlaceholder(count, inferenceMs, frameIdx);
  }

  // Handle alerts
  if (alerts.length > 0) {
    renderAlerts(alerts);
    updateEl('kpi-alerts', alerts.length);
    updateEl('alert-badge', alerts.length, true);
  }

  lastFrameIdx = frameIdx;
}

/* ── Draw detection bounding boxes on canvas ────────────────────────────── */
function drawDetections(detections) {
  if (!ctx2d) return;
  const scaleX = canvas.width  / 1280;
  const scaleY = canvas.height / 720;

  for (const det of detections) {
    const [x1, y1, x2, y2] = det.bbox;
    const conf = det.confidence;
    const sx1 = x1 * scaleX, sy1 = y1 * scaleY;
    const sw  = (x2 - x1) * scaleX, sh = (y2 - y1) * scaleY;

    // Box
    ctx2d.strokeStyle = '#00e8a0';
    ctx2d.lineWidth   = 2.5;
    ctx2d.strokeRect(sx1, sy1, sw, sh);

    // Label background
    const label = `bottle ${(conf * 100).toFixed(0)}%`;
    ctx2d.font = 'bold 13px Inter, sans-serif';
    const tw = ctx2d.measureText(label).width;
    ctx2d.fillStyle = '#00966a';
    ctx2d.fillRect(sx1, sy1 - 22, tw + 10, 22);

    // Label text
    ctx2d.fillStyle = '#ffffff';
    ctx2d.fillText(label, sx1 + 5, sy1 - 5);
  }

  // Count line
  const lineY = canvas.height * 0.6;
  ctx2d.strokeStyle = '#00ffe0';
  ctx2d.lineWidth = 2;
  ctx2d.setLineDash([12, 6]);
  ctx2d.beginPath();
  ctx2d.moveTo(0, lineY);
  ctx2d.lineTo(canvas.width, lineY);
  ctx2d.stroke();
  ctx2d.setLineDash([]);

  ctx2d.fillStyle = '#00ffe0';
  ctx2d.font = '11px JetBrains Mono, monospace';
  ctx2d.fillText('COUNTING LINE', 10, lineY - 6);
}

/* ── Placeholder frame when no image is available ───────────────────────── */
function drawPlaceholder(count, ms, frameIdx) {
  if (!ctx2d) return;
  const W = canvas.width  || 1280;
  const H = canvas.height || 720;

  // Background gradient
  const grad = ctx2d.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0f1117');
  grad.addColorStop(1, '#0a0c10');
  ctx2d.fillStyle = grad;
  ctx2d.fillRect(0, 0, W, H);

  // Grid lines
  ctx2d.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx2d.lineWidth = 1;
  for (let x = 0; x < W; x += 80) {
    ctx2d.beginPath(); ctx2d.moveTo(x, 0); ctx2d.lineTo(x, H); ctx2d.stroke();
  }
  for (let y = 0; y < H; y += 80) {
    ctx2d.beginPath(); ctx2d.moveTo(0, y); ctx2d.lineTo(W, y); ctx2d.stroke();
  }

  // Belt area
  ctx2d.fillStyle = 'rgba(55,50,65,0.5)';
  ctx2d.fillRect(0, H * 0.35, W, H * 0.4);

  // Counting line
  ctx2d.strokeStyle = '#00e8a0';
  ctx2d.lineWidth = 2;
  ctx2d.setLineDash([12, 6]);
  ctx2d.beginPath();
  ctx2d.moveTo(0, H * 0.6);
  ctx2d.lineTo(W, H * 0.6);
  ctx2d.stroke();
  ctx2d.setLineDash([]);

  // Demo bottles
  for (let i = 0; i < count; i++) {
    const x = (i * (W / (count + 1))) + W / (count + 1) + (frameIdx * 2) % 60 - 30;
    const y = H * 0.42;
    drawBottle(x, y);
  }

  // Overlay text
  ctx2d.fillStyle = '#00e8a0';
  ctx2d.font = 'bold 18px Inter, sans-serif';
  ctx2d.fillText(`🥛 Milkyway AI — DEMO MODE`, 20, 40);
  ctx2d.fillStyle = '#8b95b0';
  ctx2d.font = '13px JetBrains Mono, monospace';
  ctx2d.fillText(`Bottles: ${count}  |  ${ms.toFixed(1)}ms  |  Frame ${frameIdx}`, 20, 65);
}

function drawBottle(cx, cy) {
  // Simple bottle shape
  ctx2d.fillStyle = '#8fc8e8';
  ctx2d.fillRect(cx - 22, cy + 20, 44, 100);  // body

  ctx2d.fillStyle = '#9dd5f0';
  ctx2d.fillRect(cx - 12, cy - 20, 24, 42);   // neck

  ctx2d.fillStyle = '#e05a45';
  ctx2d.fillRect(cx - 16, cy - 35, 32, 18);   // cap

  ctx2d.fillStyle = 'rgba(255,255,255,0.15)';
  ctx2d.fillRect(cx - 18, cy + 20, 8, 100);   // highlight

  // Bounding box
  ctx2d.strokeStyle = '#00e8a0';
  ctx2d.lineWidth = 2;
  ctx2d.strokeRect(cx - 28, cy - 38, 56, 165);

  ctx2d.fillStyle = '#00966a';
  ctx2d.fillRect(cx - 28, cy - 60, 85, 22);
  ctx2d.fillStyle = 'white';
  ctx2d.font = 'bold 12px Inter';
  ctx2d.fillText('bottle 97%', cx - 24, cy - 43);
}

/* ── Connection status ──────────────────────────────────────────────────── */
function updateConnectionBadge(connected) {
  const badge = document.getElementById('connection-badge');
  if (!badge) return;
  if (connected) {
    badge.textContent = '● LIVE';
    badge.style.color = '#00e8a0';
  } else {
    badge.textContent = '○ OFFLINE';
    badge.style.color = '#ef4444';
  }
}

/* ── Toggle source ──────────────────────────────────────────────────────── */
function toggleSource() {
  const btn = document.getElementById('btn-cam-toggle');
  if (streamMode === 'demo') {
    streamMode = 'camera';
    btn.textContent = '🎭 Switch to Demo';
    connectStream('camera');
  } else {
    streamMode = 'demo';
    btn.textContent = '🎥 Switch to Camera';
    connectStream('demo');
  }
}

/* ── Alert rendering ────────────────────────────────────────────────────── */
const renderedAlerts = new Set();

function renderAlerts(alerts) {
  const list = document.getElementById('alert-list');
  if (!list) return;

  for (const alert of alerts) {
    const key = `${alert.severity}-${alert.timestamp}`;
    if (renderedAlerts.has(key)) continue;
    renderedAlerts.add(key);

    const div = document.createElement('div');
    div.className = `alert-item ${alert.severity}`;
    const icon = alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
    const time = new Date(alert.timestamp * 1000).toLocaleTimeString();
    div.innerHTML = `
      <span class="alert-item-icon">${icon}</span>
      <div>
        <div class="alert-item-text">${alert.message}</div>
        <div class="alert-item-time">${time}</div>
      </div>
    `;

    // Remove "no alerts" placeholder
    const empty = list.querySelector('.alert-empty');
    if (empty) empty.remove();

    list.insertBefore(div, list.firstChild);

    // Cap to 5 alerts shown
    while (list.children.length > 5) list.removeChild(list.lastChild);

    // Log to DB via API (fire-and-forget)
    fetch('/analytics/alerts').catch(() => {});
  }
}

function clearAlerts() {
  const list = document.getElementById('alert-list');
  if (list) list.innerHTML = '<div class="alert-empty">✅ No active alerts</div>';
  renderedAlerts.clear();
  updateEl('kpi-alerts', 0);
  updateEl('alert-badge', 0, false);
}

/* ── Utility ────────────────────────────────────────────────────────────── */
function updateEl(id, value, showBadge = null) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  if (showBadge !== null) {
    el.style.display = showBadge && value > 0 ? 'inline-block' : 'none';
  }
}
