/**
 * pages/ImageDetect.jsx
 * Drag-and-drop image upload for on-demand detection
 */
import { useState, useRef } from 'react'
import { api } from '../lib/api'

const card = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'18px', overflow:'hidden' }
const cardHead = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)', fontSize:'0.88rem', fontWeight:600 }

export function ImageDetect() {
  const [result,   setResult]  = useState(null)
  const [loading,  setLoading] = useState(false)
  const [dragOver, setDragOver]= useState(false)
  const [error,    setError]   = useState(null)
  const inputRef = useRef(null)

  const run = async (file) => {
    if (!file) return
    // Client-side file type validation
    if (!file.type.startsWith('image/')) {
      setError(`Unsupported file type: "${file.type || file.name}". Please upload a JPG, PNG, or WEBP image.`)
      setResult(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api.detectImage(file)
      if (data?.detail || data?.error) {
        setError(data.detail || data.error)
        setResult(null)
      } else {
        setResult(data)
      }
    } catch (e) {
      setError('Detection failed — is the backend running? Check http://localhost:8000/health')
      setResult(null)
    }
    setLoading(false)
  }

  const onFile = e => run(e.target.files[0])
  const onDrop = e => { e.preventDefault(); setDragOver(false); run(e.dataTransfer.files[0]) }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <div>
        <h2 style={{ fontSize:'1.15rem', fontWeight:700 }}>🔍 Image Detection</h2>
        <p style={{ color:'var(--text-2)', fontSize:'0.8rem', marginTop:'3px' }}>Upload any image to run live YOLOv8 inference</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
        <div style={card}>
          <div style={cardHead}><span>📤 Upload Image</span></div>
          <div style={{ padding:'20px' }}>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius:'14px', padding:'40px', textAlign:'center', cursor:'pointer',
                background: dragOver ? 'var(--accent-glow)' : 'transparent',
                transition:'all 0.2s',
              }}
            >
              <input ref={inputRef} type="file" accept="image/*" onChange={onFile} style={{ display:'none' }} />
              <div style={{ fontSize:'2.5rem', marginBottom:'12px' }}>🖼️</div>
              <div style={{ fontSize:'0.9rem', color:'var(--text-2)' }}>Drop an image or click to browse</div>
              <div style={{ fontSize:'0.75rem', color:'var(--text-3)', marginTop:'4px' }}>JPG, PNG, WEBP — max 20MB</div>
            </div>

            {loading && (
              <div style={{ textAlign:'center', padding:'24px', color:'var(--accent)' }}>
                <div style={{ display:'inline-block', width:'22px', height:'22px', border:'2px solid rgba(255,255,255,0.1)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite', marginBottom:'8px' }} />
                <div style={{ fontSize:'0.85rem' }}>Running inference…</div>
              </div>
            )}

            {error && !loading && (
              <div style={{
                marginTop:'16px', padding:'14px', borderRadius:'10px',
                background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)',
                color:'#fca5a5', fontSize:'0.82rem', lineHeight:1.5,
              }}>
                ⚠️ {error}
              </div>
            )}

            {result && !loading && !error && (
              <div style={{ marginTop:'16px' }}>
                {result.annotated_image_b64 && (
                  <img
                    src={`data:image/jpeg;base64,${result.annotated_image_b64}`}
                    alt="Detection result"
                    style={{ width:'100%', borderRadius:'10px', border:'1px solid var(--border)' }}
                  />
                )}
                <div style={{ display:'flex', gap:'10px', marginTop:'12px', flexWrap:'wrap' }}>
                  {[
                    { label: `🍼 ${result.count} bottle${result.count !== 1 ? 's' : ''}`, color: 'var(--accent)', bg: 'rgba(0,232,160,0.1)', border: 'var(--border-a)' },
                    { label: `⚡ ${result.inference_ms?.toFixed(1)}ms`, color: 'var(--accent2)', bg: 'rgba(79,158,255,0.08)', border: 'rgba(79,158,255,0.2)' },
                    { label: `${result.frame_width}×${result.frame_height}`, color: 'var(--amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)' },
                  ].map(p => (
                    <span key={p.label} style={{ padding:'5px 12px', borderRadius:'99px', fontSize:'0.78rem', fontWeight:600, background:p.bg, color:p.color, border:`1px solid ${p.border}` }}>
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={card}>
          <div style={cardHead}><span>📋 Detection Details</span></div>
          <div style={{ padding:'20px' }}>
            {!result ? (
              <div style={{ textAlign:'center', padding:'40px', color:'var(--text-3)', fontSize:'0.85rem' }}>
                Upload an image to see results
              </div>
            ) : result.detections?.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'var(--text-2)', fontSize:'0.85rem' }}>
                No bottles detected in this image
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                <thead>
                  <tr style={{ color:'var(--text-3)', fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    <th style={{ padding:'8px 0', borderBottom:'1px solid var(--border)', textAlign:'left' }}>#</th>
                    <th style={{ padding:'8px 0', borderBottom:'1px solid var(--border)', textAlign:'left' }}>Class</th>
                    <th style={{ padding:'8px 0', borderBottom:'1px solid var(--border)', textAlign:'right' }}>Confidence</th>
                    <th style={{ padding:'8px 0', borderBottom:'1px solid var(--border)', textAlign:'right' }}>BBox</th>
                  </tr>
                </thead>
                <tbody>
                  {result.detections.map((d, i) => (
                    <tr key={i}>
                      <td style={{ padding:'9px 0', borderBottom:'1px solid var(--border)', color:'var(--text-3)' }}>{i+1}</td>
                      <td style={{ padding:'9px 0', borderBottom:'1px solid var(--border)' }}>{d.class_name}</td>
                      <td style={{ padding:'9px 0', borderBottom:'1px solid var(--border)', textAlign:'right', color:'var(--accent)', fontWeight:700 }}>
                        {(d.confidence * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding:'9px 0', borderBottom:'1px solid var(--border)', textAlign:'right', fontFamily:'JetBrains Mono,monospace', fontSize:'0.68rem', color:'var(--text-3)' }}>
                        [{d.bbox?.join(', ')}]
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  )
}
