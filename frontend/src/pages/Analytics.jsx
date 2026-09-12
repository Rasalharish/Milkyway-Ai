/**
 * pages/Analytics.jsx
 * Analytics dashboard with charts
 */
import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { KPICard } from '../components/KPICard'
import {
  Chart, BarElement, BarController,
  LineElement, LineController, PointElement,
  ArcElement, DoughnutController,
  CategoryScale, LinearScale, Tooltip, Legend, Filler
} from 'chart.js'

Chart.register(
  BarElement, BarController,
  LineElement, LineController, PointElement,
  ArcElement, DoughnutController,
  CategoryScale, LinearScale, Tooltip, Legend, Filler
)

const card = {
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden',
}
const cardHead = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 18px', borderBottom: '1px solid var(--border)',
  fontSize: '0.88rem', fontWeight: 600,
}

function HourlyChart({ data }) {
  const ref = useRef(null); const inst = useRef(null)
  useEffect(() => {
    if (!ref.current || !data) return
    inst.current?.destroy()
    const labels = data.map(h => h.hour_bucket.slice(11))
    const counts = data.map(h => h.total_count)
    const peaks  = data.map(h => h.peak_count)
    inst.current = new Chart(ref.current, {
      data: {
        labels,
        datasets: [
          { type: 'bar',  label: 'Total Bottles', data: counts, backgroundColor: 'rgba(0,232,160,0.22)', borderColor: '#00e8a0', borderWidth: 1.5, borderRadius: 4, yAxisID: 'y' },
          { type: 'line', label: 'Peak/Frame',    data: peaks,  borderColor: '#4f9eff', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 3, tension: 0.4, yAxisID: 'yp' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#8893ac', boxWidth: 12 } }, tooltip: { backgroundColor: '#131720', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 } },
        scales: {
          x: { ticks: { maxRotation: 45, font: { size: 10 }, color: '#3e4860' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y:  { ticks: { color: '#3e4860' }, grid: { color: 'rgba(255,255,255,0.04)' }, title: { display: true, text: 'Bottles', color: '#3e4860', font: { size: 11 } } },
          yp: { position: 'right', ticks: { color: '#4f9eff' }, grid: { display: false }, title: { display: true, text: 'Peak', color: '#4f9eff', font: { size: 11 } } },
        },
      },
    })
    return () => inst.current?.destroy()
  }, [data])
  return <canvas ref={ref} />
}

function ShiftChart({ shifts }) {
  const ref = useRef(null); const inst = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    inst.current?.destroy()
    inst.current = new Chart(ref.current, {
      type: 'doughnut',
      data: {
        labels: ['Morning (6–14)', 'Afternoon (14–22)', 'Night (22–6)'],
        datasets: [{ data: [shifts.Morning||0, shifts.Afternoon||0, shifts.Night||0], backgroundColor: ['rgba(0,232,160,0.7)','rgba(79,158,255,0.7)','rgba(245,158,11,0.7)'], borderColor: ['#00e8a0','#4f9eff','#f59e0b'], borderWidth: 2, hoverOffset: 8 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#8893ac', boxWidth: 12, font: { size: 11 } } },
          tooltip: { backgroundColor: '#131720', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 },
        },
      },
    })
    return () => inst.current?.destroy()
  }, [shifts])
  return <canvas ref={ref} />
}

function PerfChart({ data }) {
  const ref = useRef(null); const inst = useRef(null)
  useEffect(() => {
    if (!ref.current || !data) return
    inst.current?.destroy()
    const labels = data.map(h => h.hour_bucket.slice(11))
    const ms     = data.map(h => h.avg_inference_ms || 0)
    inst.current = new Chart(ref.current, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Avg ms', data: ms, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.07)', borderWidth: 2, pointRadius: 2, tension: 0.4, fill: true }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#131720', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 } },
        scales: {
          x: { ticks: { maxRotation: 45, font: { size: 10 }, color: '#3e4860' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#3e4860' }, grid: { color: 'rgba(255,255,255,0.04)' }, title: { display: true, text: 'ms', color: '#3e4860', font: { size: 11 } } },
        },
      },
    })
    return () => inst.current?.destroy()
  }, [data])
  return <canvas ref={ref} />
}

export function Analytics() {
  const [summary, setSummary]   = useState(null)
  const [hourly,  setHourly]    = useState([])
  const [today,   setToday]     = useState({})
  const [loading, setLoading]   = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [s, h, t] = await Promise.all([api.getSummary(), api.getHourly(1), api.getToday()])
      setSummary(s); setHourly(h); setToday(t)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <div style={{ textAlign:'center',padding:'60px',color:'var(--text-2)' }}>Loading analytics…</div>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ fontSize:'1.15rem', fontWeight:700 }}>📊 Analytics Dashboard</h2>
          <p style={{ color:'var(--text-2)', fontSize:'0.8rem', marginTop:'3px' }}>Hourly production trends and historical metrics</p>
        </div>
        <button onClick={load} style={{ padding:'8px 16px', borderRadius:'8px', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', background:'var(--bg-card)', color:'var(--text-2)', border:'1px solid var(--border)' }}>🔄 Refresh</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px' }}>
        <KPICard icon="📦" label="Total Today"       value={(summary?.bottles_today||0).toLocaleString()} sub="bottles counted"   variant="accent" />
        <KPICard icon="🎬" label="Frames Processed"  value={(summary?.total_frames_processed||0).toLocaleString()} sub="total frames" variant="blue" />
        <KPICard icon="⚡" label="Avg Inference"     value={`${(summary?.avg_inference_ms||0).toFixed(1)}ms`} sub="per frame" variant="amber" />
        <KPICard icon="📈" label="Peak per Frame"    value={summary?.peak_count_per_frame||0} sub="max at once" variant="red" />
      </div>

      <div style={card}>
        <div style={cardHead}><span>📈 Hourly Production (last 24h)</span></div>
        <div style={{ padding:'20px', height:'280px' }}><HourlyChart data={hourly} /></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px' }}>
        <div style={card}>
          <div style={cardHead}><span>🕐 Production by Shift</span></div>
          <div style={{ padding:'20px', height:'260px' }}><ShiftChart shifts={today?.by_shift||{}} /></div>
        </div>
        <div style={card}>
          <div style={cardHead}><span>⚡ Inference Speed (ms)</span></div>
          <div style={{ padding:'20px', height:'260px' }}><PerfChart data={hourly} /></div>
        </div>
      </div>
    </div>
  )
}
