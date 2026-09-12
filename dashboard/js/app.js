/**
 * app.js — Main application controller for Milkyway AI dashboard
 */

/* ── Init ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initLiveChart();
  connectStream('demo');
  loadSummary();
  setInterval(loadSummary, 30_000);  // refresh summary every 30s
});

/* ── Page navigation ─────────────────────────────────────────────────────── */
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));

  const page = document.getElementById(`page-${pageId}`);
  const nav  = document.getElementById(`nav-${pageId}`);
  if (page) page.classList.add('active');
  if (nav)  nav.classList.add('active');

  // Lazy-load page data
  if (pageId === 'analytics') loadAnalytics();
  if (pageId === 'alerts')    loadAlerts();
}

/* ── Summary (always loaded) ─────────────────────────────────────────────── */
async function loadSummary() {
  try {
    const res  = await fetch('/analytics/summary');
    const data = await res.json();

    updateEl('kpi-total',  (data.bottles_today || 0).toLocaleString());
    updateEl('counter-big',(data.bottles_today || 0).toLocaleString());
    updateEl('kpi-alerts',  data.active_alerts || 0);

    // Shift breakdown
    const by_shift  = data.by_shift || {};
    const shifts    = { Morning: 0, Afternoon: 0, Night: 0, ...by_shift };
    const maxShift  = Math.max(1, ...Object.values(shifts));

    for (const [name, val] of Object.entries(shifts)) {
      const key = name.toLowerCase();
      updateEl(`shift-${key}`, val.toLocaleString());
      const bar = document.getElementById(`shift-${key}-bar`);
      if (bar) bar.style.width = `${(val / maxShift) * 100}%`;
    }

  } catch (e) {
    console.warn('[Milkyway] Summary fetch failed:', e);
  }
}

/* ── Analytics page ──────────────────────────────────────────────────────── */
async function loadAnalytics() {
  try {
    const [summary, hourly, today] = await Promise.all([
      fetch('/analytics/summary').then(r => r.json()),
      fetch('/analytics/hourly?days=1').then(r => r.json()),
      fetch('/analytics/today').then(r => r.json()),
    ]);

    // KPI cards
    updateEl('an-total',  (summary.bottles_today || 0).toLocaleString());
    updateEl('an-frames', (summary.total_frames_processed || 0).toLocaleString());
    updateEl('an-ms',     `${(summary.avg_inference_ms || 0).toFixed(1)}`);
    updateEl('an-peak',   summary.peak_count_per_frame || 0);

    // Hourly chart
    const labels  = hourly.map(h => h.hour_bucket.slice(11));  // HH:00
    const counts  = hourly.map(h => h.total_count);
    const peakCts = hourly.map(h => h.peak_count);
    const msVals  = hourly.map(h => h.avg_inference_ms || 0);
    initHourlyChart(labels, counts, peakCts);
    initPerfChart(labels, msVals);

    // Shift chart
    const by_shift = today.by_shift || {};
    initShiftChart(
      by_shift.Morning   || 0,
      by_shift.Afternoon || 0,
      by_shift.Night     || 0,
    );

  } catch (e) {
    console.warn('[Milkyway] Analytics fetch failed:', e);
    showToast('Failed to load analytics', 'error');
  }
}

/* ── Alerts page ─────────────────────────────────────────────────────────── */
async function loadAlerts() {
  try {
    const alerts = await fetch('/analytics/alerts').then(r => r.json());
    const list   = document.getElementById('full-alert-list');
    if (!list) return;

    if (!alerts.length) {
      list.innerHTML = '<div class="alert-empty">✅ No alerts on record</div>';
      return;
    }

    list.innerHTML = alerts.map(a => {
      const icon = a.severity === 'critical' ? '🚨' : a.severity === 'warning' ? '⚠️' : 'ℹ️';
      const time = new Date(a.timestamp * 1000).toLocaleString();
      return `
        <div class="alert-item ${a.severity}">
          <span class="alert-item-icon">${icon}</span>
          <div>
            <div class="alert-item-text">${a.message}</div>
            <div class="alert-item-time">${time}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.warn('[Milkyway] Alerts fetch failed:', e);
  }
}

/* ── Image upload & detection ────────────────────────────────────────────── */
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  showToast('Running detection…', 'info');

  const form = new FormData();
  form.append('file', file);
  form.append('annotate', 'true');

  try {
    const res  = await fetch('/detect/image', { method: 'POST', body: form });
    const data = await res.json();

    // Show annotated image
    const resultDiv = document.getElementById('upload-result');
    const img       = document.getElementById('result-image');
    if (data.annotated_image_b64) {
      img.src = 'data:image/jpeg;base64,' + data.annotated_image_b64;
      resultDiv.style.display = 'block';
    }

    // Info pills
    const infoDiv = document.getElementById('detect-info');
    infoDiv.innerHTML = `
      <span class="detect-pill">🍼 ${data.count} bottle${data.count !== 1 ? 's' : ''}</span>
      <span class="detect-pill" style="color:var(--accent2);border-color:rgba(79,158,255,0.3);background:rgba(79,158,255,0.1)">⚡ ${data.inference_ms.toFixed(1)} ms</span>
      <span class="detect-pill" style="color:var(--warning);border-color:rgba(245,158,11,0.3);background:rgba(245,158,11,0.08)">${data.frame_width}×${data.frame_height}</span>
    `;

    // Details
    const detailsDiv = document.getElementById('detect-details');
    if (!data.detections.length) {
      detailsDiv.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:24px">No bottles detected in this image.</div>';
    } else {
      detailsDiv.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.8rem">
          <thead>
            <tr style="color:var(--text-muted);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em">
              <th style="padding:8px 0;border-bottom:1px solid var(--border);text-align:left">#</th>
              <th style="padding:8px 0;border-bottom:1px solid var(--border);text-align:left">Class</th>
              <th style="padding:8px 0;border-bottom:1px solid var(--border);text-align:right">Confidence</th>
              <th style="padding:8px 0;border-bottom:1px solid var(--border);text-align:right">BBox</th>
            </tr>
          </thead>
          <tbody>
            ${data.detections.map((d, i) => `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid var(--border);color:var(--text-muted)">${i+1}</td>
                <td style="padding:8px 0;border-bottom:1px solid var(--border)">${d.class_name}</td>
                <td style="padding:8px 0;border-bottom:1px solid var(--border);text-align:right;color:var(--accent);font-weight:600">${(d.confidence*100).toFixed(1)}%</td>
                <td style="padding:8px 0;border-bottom:1px solid var(--border);text-align:right;font-family:'JetBrains Mono',monospace;font-size:0.7rem;color:var(--text-muted)">[${d.bbox.join(', ')}]</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    showToast(`Detected ${data.count} bottle${data.count !== 1 ? 's' : ''} in ${data.inference_ms.toFixed(0)}ms`, 'success');
  } catch (e) {
    showToast('Detection failed — API error', 'error');
    console.error('[Milkyway] Detection error:', e);
  }
}

// Drag-and-drop upload support
const uploadZone = document.getElementById('upload-zone');
if (uploadZone) {
  uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      document.getElementById('image-file-input').files = dt.files;
      handleImageUpload({ target: { files: [file] } });
    }
  });
}

/* ── Export CSV ──────────────────────────────────────────────────────────── */
function exportData() {
  window.open('/reports/export/csv', '_blank');
  showToast('Downloading CSV…', 'success');
}

/* ── Reset Counter ───────────────────────────────────────────────────────── */
function resetCounter() {
  totalCounted = 0;
  updateEl('counter-big', '0');
  updateEl('kpi-total', '0');
  showToast('Counter reset', 'info');
}

/* ── Toast notifications ─────────────────────────────────────────────────── */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
  toast.textContent = `${icons[type] || ''} ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
