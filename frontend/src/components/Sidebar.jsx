/**
 * components/Sidebar.jsx
 */

const items = [
  { id: 'live',      icon: '📡', label: 'Live Monitor'  },
  { id: 'analytics', icon: '📊', label: 'Analytics'     },
  { id: 'detect',    icon: '🔍', label: 'Image Detect'  },
  { id: 'model',     icon: '🧠', label: 'Model Info'    },
  { id: 'alerts',    icon: '🔔', label: 'Alerts'        },
]

export function Sidebar({ active, onChange, alertCount = 0 }) {
  return (
    <aside style={{
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      padding: '20px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
      minWidth: '200px',
    }}>
      <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', padding: '8px 10px' }}>
        Monitoring
      </div>

      {items.map(item => {
        const isActive = active === item.id
        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => onChange(item.id)}
            onKeyDown={e => e.key === 'Enter' && onChange(item.id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 12px', borderRadius: '8px',
              fontSize: '0.84rem', fontWeight: 500, cursor: 'pointer',
              color: isActive ? 'var(--accent)' : 'var(--text-2)',
              background: isActive ? 'rgba(0,232,160,0.1)' : 'transparent',
              border: `1px solid ${isActive ? 'rgba(0,232,160,0.22)' : 'transparent'}`,
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span>{item.icon}</span> {item.label}
            </span>
            {item.id === 'alerts' && alertCount > 0 && (
              <span style={{
                background: 'var(--danger)', color: 'white',
                borderRadius: '99px', padding: '1px 7px',
                fontSize: '0.62rem', fontWeight: 700,
              }}>
                {alertCount}
              </span>
            )}
          </div>
        )
      })}

      <div style={{ flex: 1 }} />

      <div style={{ padding: '12px', borderTop: '1px solid var(--border)', marginTop: '12px' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Milkyway AI v1.0</div>
      </div>
    </aside>
  )
}
