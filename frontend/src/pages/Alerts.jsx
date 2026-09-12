/**
 * pages/Alerts.jsx
 * Full alert history page
 */
import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const card = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'18px', overflow:'hidden' }
const cardHead = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)', fontSize:'0.88rem', fontWeight:600 }

export function Alerts({ liveAlerts = [] }) {
  const [dbAlerts, setDbAlerts] = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = async () => {
    setLoading(true)
    try { const data = await api.getAlerts(); setDbAlerts(data) } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const all = [...liveAlerts, ...dbAlerts]

  const icon = (sev) => sev === 'critical' ? '🚨' : sev === 'warning' ? '⚠️' : 'ℹ️'
  const colors = {
    warning:  { bg:'rgba(245,158,11,0.08)',  border:'rgba(245,158,11,0.22)',  text:'#fcd34d' },
    critical: { bg:'rgba(239,68,68,0.08)',   border:'rgba(239,68,68,0.22)',   text:'#fca5a5' },
    info:     { bg:'rgba(79,158,255,0.08)',  border:'rgba(79,158,255,0.2)',   text:'#93c5fd' },
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ fontSize:'1.15rem', fontWeight:700 }}>🔔 Alert History</h2>
          <p style={{ color:'var(--text-2)', fontSize:'0.8rem', marginTop:'3px' }}>System events and production anomalies</p>
        </div>
        <button onClick={load} style={{ padding:'8px 16px', borderRadius:'8px', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', background:'var(--bg-card)', color:'var(--text-2)', border:'1px solid var(--border)' }}>🔄 Refresh</button>
      </div>

      <div style={card}>
        <div style={cardHead}><span>Recent Alerts</span><span style={{ fontSize:'0.73rem', color:'var(--text-3)' }}>{all.length} records</span></div>
        <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'8px' }}>
          {loading && <div style={{ textAlign:'center', padding:'30px', color:'var(--text-2)' }}>Loading…</div>}
          {!loading && all.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-3)', fontSize:'0.85rem' }}>✅ No alerts on record</div>
          )}
          {all.map((a, i) => {
            const c = colors[a.severity] || colors.info
            return (
              <div key={i} style={{ display:'flex', gap:'10px', padding:'12px', borderRadius:'10px', background:c.bg, border:`1px solid ${c.border}`, animation:'slideIn 0.3s ease' }}>
                <span style={{ fontSize:'1rem' }}>{icon(a.severity)}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'0.82rem', color:c.text, lineHeight:1.4 }}>{a.message}</div>
                  <div style={{ fontSize:'0.68rem', color:'var(--text-3)', marginTop:'4px', fontFamily:'JetBrains Mono,monospace' }}>
                    {new Date(a.timestamp * 1000).toLocaleString()}
                    {a.resolved ? ' · resolved' : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}
