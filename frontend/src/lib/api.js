/**
 * lib/api.js — Milkyway AI API client
 * In dev: calls are proxied via Vite → FastAPI on :8000
 * In prod (built + served by FastAPI): calls go directly to same origin
 */

const BASE = ''  // relative — Vite proxies to :8000 in dev

export const api = {
  /** GET /analytics/summary */
  getSummary: () => fetch(`${BASE}/analytics/summary`).then(r => r.json()),

  /** GET /analytics/today */
  getToday: () => fetch(`${BASE}/analytics/today`).then(r => r.json()),

  /** GET /analytics/hourly */
  getHourly: (days = 1) => fetch(`${BASE}/analytics/hourly?days=${days}`).then(r => r.json()),

  /** GET /analytics/model-info */
  getModelInfo: () => fetch(`${BASE}/analytics/model-info`).then(r => r.json()),

  /** GET /analytics/alerts */
  getAlerts: () => fetch(`${BASE}/analytics/alerts`).then(r => r.json()),

  /** POST /detect/image */
  detectImage: (file) => {
    const form = new FormData()
    form.append('file', file)
    form.append('annotate', 'true')
    return fetch(`${BASE}/detect/image`, { method: 'POST', body: form }).then(r => r.json())
  },

  /** GET /reports/export/csv */
  exportCSV: () => { window.open(`${BASE}/reports/export/csv`, '_blank') },

  /** WebSocket URL */
  wsUrl: (demo = true) => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host  = BASE ? BASE.replace(/^https?:\/\//, '') : window.location.host
    return `${proto}//${host}/ws/stream?demo=${demo}`
  },
}
