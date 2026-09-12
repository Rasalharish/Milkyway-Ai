/**
 * components/Topnav.jsx
 */
import { Wifi, WifiOff, Zap, FlaskConical } from 'lucide-react'

const styles = {
  nav: {
    position: 'sticky', top: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 28px', height: '60px',
    background: 'rgba(8,11,16,0.88)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--border)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: '10px' },
  logo: {
    width: 36, height: 36,
    background: 'linear-gradient(135deg, #00e8a0, #4f9eff)',
    borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px',
    boxShadow: '0 0 20px rgba(0,232,160,0.3)',
  },
  title: { fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.03em' },
  badges: { display: 'flex', alignItems: 'center', gap: '8px' },
  badge: {
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '4px 10px', borderRadius: '99px',
    fontSize: '0.7rem', fontWeight: 700,
    letterSpacing: '0.04em', textTransform: 'uppercase',
    border: '1px solid',
  },
  actions: { display: 'flex', gap: '8px' },
}

export function Topnav({ connected, demoMode, onExport, onToggleSource }) {
  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <div style={styles.logo}>🥛</div>
        <div style={styles.title}>
          Milky<span style={{ color: 'var(--accent)' }}>way</span> AI
        </div>
      </div>

      <div style={styles.badges}>
        {connected ? (
          <span style={{ ...styles.badge, background: 'rgba(0,232,160,0.1)', color: 'var(--accent)', borderColor: 'var(--border-a)' }}>
            <Wifi size={10} /> LIVE
          </span>
        ) : (
          <span style={{ ...styles.badge, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.25)' }}>
            <WifiOff size={10} /> OFFLINE
          </span>
        )}
        {demoMode && (
          <span style={{ ...styles.badge, background: 'rgba(245,158,11,0.1)', color: 'var(--amber)', borderColor: 'rgba(245,158,11,0.25)' }}>
            <FlaskConical size={10} /> DEMO
          </span>
        )}
        <span style={{ ...styles.badge, background: 'rgba(79,158,255,0.1)', color: 'var(--accent2)', borderColor: 'rgba(79,158,255,0.22)' }}>
          <Zap size={10} /> YOLOv8n · mAP 98.4%
        </span>
      </div>

      <div style={styles.actions}>
        <button onClick={onToggleSource} style={{
          padding: '7px 14px', borderRadius: '8px', fontSize: '0.8rem',
          fontWeight: 600, cursor: 'pointer',
          background: 'var(--bg-card)', color: 'var(--text-2)',
          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          {demoMode ? '🎥 Camera' : '🎭 Demo'}
        </button>
        <button onClick={onExport} style={{
          padding: '7px 14px', borderRadius: '8px', fontSize: '0.8rem',
          fontWeight: 600, cursor: 'pointer',
          background: 'var(--bg-card)', color: 'var(--text-2)',
          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          ⬇ Export CSV
        </button>
        <button onClick={() => window.open('/docs','_blank')} style={{
          padding: '7px 14px', borderRadius: '8px', fontSize: '0.8rem',
          fontWeight: 600, cursor: 'pointer',
          background: 'linear-gradient(135deg, var(--accent), #00c47f)',
          color: '#080b10', border: 'none', display: 'flex', alignItems: 'center', gap: '6px',
          boxShadow: '0 0 18px rgba(0,232,160,0.25)',
        }}>
          📖 API Docs
        </button>
      </div>
    </nav>
  )
}
