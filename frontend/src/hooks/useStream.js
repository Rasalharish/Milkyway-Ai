/**
 * hooks/useStream.js
 * React hook that manages the WebSocket connection to the backend stream.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../lib/api'

const HISTORY_SIZE = 150

export function useStream(demoMode = true) {
  const wsRef      = useRef(null)
  const [connected, setConnected]  = useState(false)
  const [frame, setFrame]          = useState(null)      // latest frame data
  const [history, setHistory]      = useState(Array(HISTORY_SIZE).fill(0))
  const [totalCounted, setTotal]   = useState(0)
  const [alerts, setAlerts]        = useState([])

  const connect = useCallback((demo) => {
    if (wsRef.current) wsRef.current.close()

    const ws = new WebSocket(api.wsUrl(demo))
    wsRef.current = ws

    ws.onopen  = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.error) return

        setFrame(data)
        setTotal(data.total_counted || 0)

        setHistory(prev => {
          const next = [...prev.slice(1), data.count || 0]
          return next
        })

        if (data.alerts?.length > 0) {
          setAlerts(prev => {
            const all = [...data.alerts, ...prev]
            return all.slice(0, 20)
          })
        }
      } catch { /* ignore */ }
    }
  }, [])

  // Start on mount / when demoMode changes
  useEffect(() => {
    connect(demoMode)
    return () => wsRef.current?.close()
  }, [connect, demoMode])

  const sendStop = () => wsRef.current?.send(JSON.stringify({ type: 'stop' }))

  return { connected, frame, history, totalCounted, alerts, sendStop, reconnect: connect }
}
