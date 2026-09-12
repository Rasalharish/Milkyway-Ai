/**
 * components/KPICard.jsx
 */

const ACCENT_MAP = {
  accent: { color: 'var(--accent)',  grad: 'linear-gradient(90deg,#00e8a0,#4f9eff)' },
  blue:   { color: 'var(--accent2)', grad: 'linear-gradient(90deg,#4f9eff,#8b5cf6)' },
  amber:  { color: 'var(--amber)',   grad: 'linear-gradient(90deg,#f59e0b,#f97316)' },
  red:    { color: 'var(--danger)',  grad: 'linear-gradient(90deg,#ef4444,#ec4899)' },
}

export function KPICard({ icon, label, value, sub, variant = 'accent', animate = false }) {
  const { color, grad } = ACCENT_MAP[variant] || ACCENT_MAP.accent

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '18px',
      padding: '22px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.25s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.35)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: grad, borderRadius: '18px 18px 0 0' }} />

      <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
        {label}
      </div>
      <div style={{
        fontSize: '2.3rem', fontWeight: 900, letterSpacing: '-0.06em',
        lineHeight: 1, margin: '6px 0 4px', color,
        transition: animate ? 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)' : undefined,
      }}>
        {value}
      </div>
      <div style={{ fontSize: '0.73rem', color: 'var(--text-3)' }}>{sub}</div>
    </div>
  )
}
