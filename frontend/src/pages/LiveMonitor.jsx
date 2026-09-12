/**
 * pages/LiveMonitor.jsx
 * Main live monitoring page with KPIs, feed, counter, alerts
 */
import { useMemo, useState, useEffect } from 'react'
import { KPICard } from '../components/KPICard'
import { LiveFeed } from '../components/LiveFeed'
import { MiniChart } from '../components/MiniChart'
import { api } from '../lib/api'

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '18px',
  overflow: 'hidden',
}
const cardHead = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 18px', borderBottom: '1px solid var(--border)',
  fontSize: '0.88rem', fontWeight: 600,
}

export function LiveMonitor({ frame, history, totalCounted, alerts, connected }) {
  const count      = frame?.count ?? 0
  const inferMs    = frame?.inference_ms ?? 0
  const alertCount = alerts?.length ?? 0

  // Fetch real shift data from the DB instead of using hardcoded ratios
  const [shiftData, setShiftData] = useState({})
  useEffect(() => {
    api.getToday()
      .then(d => setShiftData(d.by_shift ?? {}))
      .catch(() => {})
  }, [totalCounted])  // refresh whenever counter ticks

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
        <KPICard icon="🍼" label="In Frame" value={count} sub="bottles detected" variant="accent" animate />
        <KPICard icon="📦" label="Counted Today" value={totalCounted.toLocaleString()} sub="crossed line" variant="blue" />
        <KPICard icon="⚡" label="Inference" value={`${inferMs.toFixed(0)}`} sub="ms per frame" variant="amber" />
        <KPICard icon="🔔" label="Alerts" value={alertCount} sub="active notifications" variant="red" />
      </div>

      {/* Main grid: feed + side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '18px' }}>

        {/* Feed column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={card}>
            <div style={cardHead}>
              <span>📹 Live Camera Feed</span>
              <span style={{
                padding: '3px 9px', borderRadius: '99px', fontSize: '0.68rem', fontWeight: 700,
                background: connected ? 'rgba(0,232,160,0.1)' : 'rgba(239,68,68,0.1)',
                color: connected ? 'var(--accent)' : 'var(--danger)',
                border: `1px solid ${connected ? 'rgba(0,232,160,0.22)' : 'rgba(239,68,68,0.25)'}`,
              }}>
                {connected ? '● STREAMING' : '○ DISCONNECTED'}
              </span>
            </div>
            <div style={{ padding: '14px' }}>
              <LiveFeed frameData={frame} />

              {/* Mini history chart */}
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Count History — Last {history.length} frames
                </div>
                <div style={{ height: '90px' }}>
                  <MiniChart history={history} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Production counter */}
          <div style={card}>
            <div style={cardHead}>🍼 Production Counter</div>
            <div style={{ textAlign: 'center', padding: '28px 20px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                Total Bottles Today
              </div>
              <div style={{
                fontSize: '4.5rem', fontWeight: 900, letterSpacing: '-0.07em',
                lineHeight: 1, margin: '8px 0 6px',
                color: 'var(--accent)', textShadow: '0 0 40px rgba(0,232,160,0.3)',
              }}>
                {totalCounted.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>crossed the counting line</div>
            </div>
          </div>

          {/* Shift breakdown */}
          <div style={card}>
            <div style={cardHead}>🕐 Shift Breakdown</div>
            <div style={{ padding: '14px 18px' }}>
              {[
                ['🌅 Morning',   shiftData.Morning,   'var(--accent)'],
                ['☀️ Afternoon', shiftData.Afternoon, 'var(--accent2)'],
                ['🌙 Night',     shiftData.Night,     'var(--amber)'],
              ].map(([name, val, color]) => {
                const pct = totalCounted ? (val / totalCounted) * 100 : 0
                return (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', minWidth: '90px' }}>{name}</span>
                    <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', minWidth: '50px', textAlign: 'right' }}>
                      {val.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Alerts */}
          <div style={card}>
            <div style={cardHead}>
              <span>🔔 Alerts</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{alertCount} active</span>
            </div>
            <div style={{ padding: '10px 12px', maxHeight: '200px', overflowY: 'auto' }}>
              {alerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-3)', fontSize: '0.82rem' }}>
                  ✅ No active alerts
                </div>
              ) : alerts.slice(0, 5).map((a, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '8px', padding: '10px', borderRadius: '8px', marginBottom: '6px',
                  background: a.severity === 'warning' ? 'rgba(245,158,11,0.07)' : 'rgba(239,68,68,0.07)',
                  border: `1px solid ${a.severity === 'warning' ? 'rgba(245,158,11,0.22)' : 'rgba(239,68,68,0.22)'}`,
                }}>
                  <span>{a.severity === 'warning' ? '⚠️' : '🚨'}</span>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: a.severity === 'warning' ? '#fcd34d' : '#fca5a5', lineHeight: 1.4 }}>{a.message}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px', fontFamily: 'JetBrains Mono,monospace' }}>
                      {new Date(a.timestamp * 1000).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
