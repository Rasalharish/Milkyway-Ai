/**
 * pages/ModelInfo.jsx
 * Model architecture, training metrics, and curves
 */

const card = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'18px', overflow:'hidden' }
const cardHead = { padding:'14px 18px', borderBottom:'1px solid var(--border)', fontSize:'0.88rem', fontWeight:600 }

function MetricChip({ label, value, color = 'var(--accent)' }) {
  return (
    <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'10px', padding:'14px' }}>
      <div style={{ fontSize:'0.67rem', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-3)' }}>{label}</div>
      <div style={{ fontSize:'1.6rem', fontWeight:900, letterSpacing:'-0.04em', color, marginTop:'4px' }}>{value}</div>
    </div>
  )
}

const tableRow = (label, value) => (
  <tr key={label}>
    <td style={{ padding:'9px 0', borderBottom:'1px solid var(--border)', color:'var(--text-2)', fontSize:'0.82rem' }}>{label}</td>
    <td style={{ padding:'9px 0', borderBottom:'1px solid var(--border)', fontWeight:600, textAlign:'right', fontSize:'0.82rem' }}>{value}</td>
  </tr>
)

export function ModelInfo() {
  const metrics = [
    { label:'mAP @ 50',    value:'98.4%', color:'var(--accent)' },
    { label:'mAP @ 50-95', value:'64.1%', color:'var(--accent2)' },
    { label:'Precision',   value:'93.9%', color:'var(--accent)' },
    { label:'Recall',      value:'97.0%', color:'var(--accent)' },
    { label:'Inference',   value:'35.9ms',color:'var(--amber)' },
    { label:'Parameters',  value:'3.0M',  color:'var(--accent2)' },
  ]

  const dataStats = [
    { val:'1,073', label:'Total Images', color:'var(--accent)' },
    { val:'858',   label:'Train',        color:'var(--accent2)' },
    { val:'107',   label:'Validation',   color:'var(--amber)' },
    { val:'108',   label:'Test',         color:'var(--danger)' },
    { val:'1',     label:'Class',        color:'var(--text-1)' },
  ]

  const BASE = ''

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <div>
        <h2 style={{ fontSize:'1.15rem', fontWeight:700 }}>🧠 Model Information</h2>
        <p style={{ color:'var(--text-2)', fontSize:'0.8rem', marginTop:'3px' }}>YOLOv8n trained on 1,073 images at Muralya Dairy</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px' }}>
        <div style={card}>
          <div style={cardHead}>📊 Performance Metrics</div>
          <div style={{ padding:'18px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              {metrics.map(m => <MetricChip key={m.label} {...m} />)}
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={cardHead}>🏗️ Architecture</div>
          <div style={{ padding:'18px' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <tbody>
                {[
                  ['Model',         'YOLOv8n (nano)'],
                  ['GFLOPs',        '8.1'],
                  ['Input Size',    '640 × 640'],
                  ['Anchors',       '8,400'],
                  ['Classes',       '1 (milk_bottle)'],
                  ['Activation',    'SiLU'],
                  ['Training Device','Apple M5 (MPS)'],
                  ['Epochs',        '100 (early stop)'],
                  ['Batch Size',    '16'],
                  ['Training Time', '~2h 25m'],
                ].map(([l,v]) => tableRow(l, v))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Training Graphs */}
      <div style={card}>
        <div style={cardHead}>📉 Training Curves — Loss + mAP (100 epochs)</div>
        <div style={{ padding:'18px' }}>
          <img
            src={`${BASE}/assets/training_graphs.png`}
            alt="Training curves"
            style={{ width:'100%', borderRadius:'10px', border:'1px solid var(--border)' }}
            onError={e => e.target.style.display='none'}
          />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px' }}>
        <div style={card}>
          <div style={cardHead}>📊 Precision-Recall Curve</div>
          <div style={{ padding:'18px' }}>
            <img src={`${BASE}/assets/BoxPR_curve.png`} alt="PR curve" style={{ width:'100%', borderRadius:'10px', border:'1px solid var(--border)' }} onError={e => e.target.style.display='none'} />
          </div>
        </div>
        <div style={card}>
          <div style={cardHead}>🗃️ Confusion Matrix (Normalized)</div>
          <div style={{ padding:'18px' }}>
            <img src={`${BASE}/assets/confusion_matrix_normalized.png`} alt="Confusion matrix" style={{ width:'100%', borderRadius:'10px', border:'1px solid var(--border)' }} onError={e => e.target.style.display='none'} />
          </div>
        </div>
      </div>

      {/* Dataset */}
      <div style={card}>
        <div style={cardHead}>📁 Dataset Summary</div>
        <div style={{ padding:'24px', display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'16px', textAlign:'center' }}>
          {dataStats.map(({ val, label, color }) => (
            <div key={label}>
              <div style={{ fontSize:'2rem', fontWeight:900, color, letterSpacing:'-0.04em' }}>{val}</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text-3)', marginTop:'4px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
