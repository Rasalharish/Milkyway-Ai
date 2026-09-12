/**
 * components/MiniChart.jsx
 * Live count history chart (Chart.js line)
 */
import { useEffect, useRef } from 'react'
import { Chart, LineElement, PointElement, LineController, CategoryScale, LinearScale, Filler } from 'chart.js'

Chart.register(LineElement, PointElement, LineController, CategoryScale, LinearScale, Filler)

export function MiniChart({ history }) {
  const ref  = useRef(null)
  const inst = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    if (inst.current) inst.current.destroy()

    inst.current = new Chart(ref.current, {
      type: 'line',
      data: {
        labels: Array(history.length).fill(''),
        datasets: [{
          data: history,
          borderColor: '#00e8a0',
          backgroundColor: 'rgba(0,232,160,0.07)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: {
            min: 0, suggestedMax: 6,
            ticks: { stepSize: 2, font: { size: 10 }, color: '#3e4860' },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
        },
      },
    })
    return () => inst.current?.destroy()
  }, [])

  useEffect(() => {
    if (!inst.current) return
    inst.current.data.datasets[0].data = history
    inst.current.update('none')
  }, [history])

  return <canvas ref={ref} />
}
