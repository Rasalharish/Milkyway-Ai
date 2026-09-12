/**
 * App.jsx — Milkyway AI root component
 */
import { useState } from 'react'
import { Topnav }     from './components/Topnav'
import { Sidebar }    from './components/Sidebar'
import { LiveMonitor }from './pages/LiveMonitor'
import { Analytics }  from './pages/Analytics'
import { ImageDetect }from './pages/ImageDetect'
import { ModelInfo }  from './pages/ModelInfo'
import { Alerts }     from './pages/Alerts'
import { useStream }  from './hooks/useStream'
import { api }        from './lib/api'

export default function App() {
  const [page,     setPage]     = useState('live')
  const [demoMode, setDemoMode] = useState(true)

  const { connected, frame, history, totalCounted, alerts, reconnect } = useStream(demoMode)

  const toggleSource = () => {
    setDemoMode(prev => {
      const next = !prev
      reconnect(next)
      return next
    })
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', position:'relative', zIndex:1 }}>
      <Topnav
        connected={connected}
        demoMode={demoMode}
        onExport={() => api.exportCSV()}
        onToggleSource={toggleSource}
      />

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <Sidebar
          active={page}
          onChange={setPage}
          alertCount={alerts.length}
        />

        <main style={{
          flex:1, overflowY:'auto',
          padding:'24px', background:'var(--bg-base)',
          display:'flex', flexDirection:'column',
        }}>
          {page === 'live'      && <LiveMonitor frame={frame} history={history} totalCounted={totalCounted} alerts={alerts} connected={connected} />}
          {page === 'analytics' && <Analytics />}
          {page === 'detect'    && <ImageDetect />}
          {page === 'model'     && <ModelInfo />}
          {page === 'alerts'    && <Alerts liveAlerts={alerts} />}
        </main>
      </div>
    </div>
  )
}
