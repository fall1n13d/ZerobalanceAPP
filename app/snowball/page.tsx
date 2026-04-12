'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

export default function SnowballPage() {
  const supabase = createClient()
  const [debts, setDebts] = useState<any[]>([])
  const [extraPayment, setExtraPayment] = useState('')
  const [method, setMethod] = useState('avalanche')
  const [loading, setLoading] = useState(true)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const pieRef = useRef<HTMLCanvasElement>(null)
  const lineRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => { loadDebts() }, [])
  useEffect(() => { if (debts.length > 0) { drawPie(); drawLine() } }, [debts, method, extraPayment, hoveredIndex])

  async function loadDebts() {
    const { data } = await supabase.from('debts').select('*')
    setDebts(data || [])
    setLoading(false)
  }

  function calculatePayoff() {
    let debtsCopy = debts.filter(d => !d.paid).map(d => ({
      ...d, balance: Number(d.balance), min_payment: Number(d.min_payment), apr: Number(d.apr),
    }))
    if (method === 'avalanche') debtsCopy.sort((a, b) => b.apr - a.apr)
    else debtsCopy.sort((a, b) => a.balance - b.balance)
    const extra = parseFloat(extraPayment) || 0
    let month = 0, totalInterest = 0
    const monthlyTotals: number[] = []
    while (debtsCopy.some(d => d.balance > 0) && month < 600) {
      month++
      let extraLeft = extra
      for (let i = 0; i < debtsCopy.length; i++) {
        if (debtsCopy[i].balance <= 0) continue
        const interest = (debtsCopy[i].balance * (debtsCopy[i].apr / 100)) / 12
        totalInterest += interest
        debtsCopy[i].balance += interest
        debtsCopy[i].balance -= debtsCopy[i].min_payment
        if (debtsCopy[i].balance < 0) debtsCopy[i].balance = 0
      }
      for (let i = 0; i < debtsCopy.length; i++) {
        if (debtsCopy[i].balance <= 0) continue
        const pay = Math.min(extraLeft, debtsCopy[i].balance)
        debtsCopy[i].balance -= pay; extraLeft -= pay; break
      }
      monthlyTotals.push(debtsCopy.reduce((s, d) => s + Math.max(0, d.balance), 0))
    }
    return { months: month, totalInterest, monthlyTotals }
  }

  const COLORS = ['#ff5b5b','#ffb830','#3dffa0','#60a5fa','#c084fc','#f472b6','#34d399','#fb923c','#a78bfa','#38bdf8']

  function drawPie() {
    const canvas = pieRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const active = debts.filter(d => !d.paid)
    if (!active.length) return
    const dpr = window.devicePixelRatio || 1
    const size = 300
    canvas.width = size * dpr; canvas.height = size * dpr
    canvas.style.width = `${size}px`; canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)
    const cx = size / 2, cy = size / 2
    const total = active.reduce((s, d) => s + Number(d.balance), 0)
    let startAngle = -Math.PI / 2
    ctx.clearRect(0, 0, size, size)

    // Glow background
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150)
    glow.addColorStop(0, 'rgba(61,255,160,0.04)')
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, size, size)

    active.forEach((d, i) => {
      const slice = (Number(d.balance) / total) * Math.PI * 2
      const isHovered = hoveredIndex === i
      const outerR = isHovered ? 135 : 125
      const innerR = isHovered ? 72 : 68
      const color = COLORS[i % COLORS.length]

      // Shadow glow for hovered
      if (isHovered) {
        ctx.shadowColor = color
        ctx.shadowBlur = 20
      }

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, outerR, startAngle, startAngle + slice)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
      ctx.shadowBlur = 0

      // Slice border
      ctx.strokeStyle = 'rgba(13,15,14,0.9)'
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Percentage label on larger slices
      const pct = Math.round((Number(d.balance) / total) * 100)
      if (pct > 8) {
        const midAngle = startAngle + slice / 2
        const labelR = (outerR + innerR) / 2
        const lx = cx + Math.cos(midAngle) * labelR
        const ly = cy + Math.sin(midAngle) * labelR
        ctx.fillStyle = 'rgba(0,0,0,0.8)'
        ctx.font = `bold 11px DM Mono, monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${pct}%`, lx, ly)
      }

      startAngle += slice
    })

    // Donut hole with gradient
    const holeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 68)
    holeGrad.addColorStop(0, '#161918')
    holeGrad.addColorStop(1, '#0d0f0e')
    ctx.beginPath()
    ctx.arc(cx, cy, 68, 0, Math.PI * 2)
    ctx.fillStyle = holeGrad
    ctx.fill()

    // Center ring
    ctx.beginPath()
    ctx.arc(cx, cy, 68, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Center text
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (hoveredIndex !== null && active[hoveredIndex]) {
      const d = active[hoveredIndex]
      const pct = Math.round((Number(d.balance) / total) * 100)
      ctx.fillStyle = COLORS[hoveredIndex % COLORS.length]
      ctx.font = `bold 15px DM Mono, monospace`
      ctx.fillText(`${pct}%`, cx, cy - 14)
      ctx.fillStyle = 'rgba(238,245,241,0.9)'
      ctx.font = `11px DM Mono, monospace`
      ctx.fillText(d.name.length > 10 ? d.name.slice(0,10)+'…' : d.name, cx, cy + 2)
      ctx.fillStyle = 'rgba(182,193,188,0.7)'
      ctx.font = `10px DM Mono, monospace`
      ctx.fillText(`$${Number(d.balance).toFixed(0)}`, cx, cy + 18)
    } else {
      ctx.fillStyle = '#ff5b5b'
      ctx.font = `bold 17px DM Mono, monospace`
      ctx.fillText(`$${total >= 1000 ? (total/1000).toFixed(1)+'k' : total.toFixed(0)}`, cx, cy - 8)
      ctx.fillStyle = 'rgba(182,193,188,0.7)'
      ctx.font = `10px DM Mono, monospace`
      ctx.fillText('total debt', cx, cy + 10)
    }
  }

  function drawLine() {
    const canvas = lineRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const { monthlyTotals } = calculatePayoff()
    if (!monthlyTotals.length) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const w = rect.width, h = rect.height
    const pad = { top: 16, right: 16, bottom: 36, left: 64 }
    const cw = w - pad.left - pad.right, ch = h - pad.top - pad.bottom
    const maxBal = Math.max(...monthlyTotals, 1)
    const total = monthlyTotals.length
    ctx.clearRect(0, 0, w, h)

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (ch / 4) * i
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke()
      const val = maxBal - (maxBal / 4) * i
      ctx.fillStyle = 'rgba(182,193,188,0.5)'
      ctx.font = '9px DM Mono, monospace'; ctx.textAlign = 'right'
      ctx.fillText(`$${val >= 1000 ? (val/1000).toFixed(0)+'k' : val.toFixed(0)}`, pad.left - 5, y + 3)
    }

    // X labels
    const labelCount = Math.min(5, total)
    for (let i = 0; i <= labelCount; i++) {
      const mo = Math.round((total / labelCount) * i)
      const x = pad.left + (cw / total) * mo
      ctx.fillStyle = 'rgba(182,193,188,0.5)'
      ctx.font = '9px DM Mono, monospace'; ctx.textAlign = 'center'
      ctx.fillText(`${mo}mo`, x, h - 6)
    }

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch)
    grad.addColorStop(0, 'rgba(255,91,91,0.25)')
    grad.addColorStop(0.6, 'rgba(255,184,48,0.1)')
    grad.addColorStop(1, 'rgba(61,255,160,0.02)')
    ctx.beginPath()
    ctx.moveTo(pad.left, pad.top + ch)
    monthlyTotals.forEach((val, i) => {
      const x = pad.left + (cw / total) * i
      const y = pad.top + ch - (val / maxBal) * ch
      i === 0 ? ctx.lineTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.lineTo(pad.left + cw, pad.top + ch)
    ctx.closePath()
    ctx.fillStyle = grad; ctx.fill()

    // Gradient line
    const lineGrad = ctx.createLinearGradient(pad.left, 0, pad.left + cw, 0)
    lineGrad.addColorStop(0, '#ff5b5b')
    lineGrad.addColorStop(0.5, '#ffb830')
    lineGrad.addColorStop(1, '#3dffa0')
    ctx.beginPath()
    monthlyTotals.forEach((val, i) => {
      const x = pad.left + (cw / total) * i
      const y = pad.top + ch - (val / maxBal) * ch
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = lineGrad; ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'; ctx.stroke()

    // End dot
    ctx.shadowColor = '#3dffa0'; ctx.shadowBlur = 12
    ctx.beginPath(); ctx.arc(pad.left + cw, pad.top + ch, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#3dffa0'; ctx.fill()
    ctx.shadowBlur = 0

    // Start dot
    const sy = pad.top + ch - (monthlyTotals[0] / maxBal) * ch
    ctx.shadowColor = '#ff5b5b'; ctx.shadowBlur = 12
    ctx.beginPath(); ctx.arc(pad.left, sy, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#ff5b5b'; ctx.fill()
    ctx.shadowBlur = 0
  }

  function handlePieHover(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = pieRef.current; if (!canvas) return
    const active = debts.filter(d => !d.paid); if (!active.length) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left - 150
    const y = e.clientY - rect.top - 150
    const dist = Math.sqrt(x*x + y*y)
    if (dist < 68 || dist > 130) { setHoveredIndex(null); return }
    const angle = Math.atan2(y, x)
    const normalizedAngle = angle < -Math.PI / 2 ? angle + Math.PI * 2.5 : angle + Math.PI / 2
    const total = active.reduce((s, d) => s + Number(d.balance), 0)
    let cumulative = 0
    for (let i = 0; i < active.length; i++) {
      cumulative += (Number(active[i].balance) / total) * Math.PI * 2
      if (normalizedAngle <= cumulative) { setHoveredIndex(i); return }
    }
    setHoveredIndex(null)
  }

  const activeDebts = debts.filter(d => !d.paid)
  const payoff = activeDebts.length > 0 ? calculatePayoff() : null
  const totalBalance = activeDebts.reduce((s, d) => s + Number(d.balance), 0)
  const sortedDebts = [...activeDebts].sort((a, b) =>
    method === 'avalanche' ? Number(b.apr) - Number(a.apr) : Number(a.balance) - Number(b.balance)
  )

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <div className="page-title">Snowball</div>
          <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'8px'}}>Debt breakdown · Payoff timeline · Strategy</div>
        </div>

        {loading ? <p style={{color:'var(--t3)'}}>Loading...</p> : activeDebts.length === 0 ? (
          <div className="card">
            <div className="card-body">
              <p style={{color:'var(--t3)'}}>No active debts. <Link href="/debts" style={{color:'var(--green)'}}>Add some debts first.</Link></p>
            </div>
          </div>
        ) : (
          <>
            {/* Top row — pie + summary */}
            <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'16px',marginBottom:'16px',alignItems:'start'}}>

              {/* Pie chart card */}
              <div className="card" style={{minWidth:'0'}}>
                <div className="card-head"><span className="card-title">🥧 Debt Breakdown</span></div>
                <div style={{padding:'20px',display:'flex',flexDirection:'column',alignItems:'center',gap:'16px'}}>
                  <canvas
                    ref={pieRef}
                    onMouseMove={handlePieHover}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{cursor:'pointer'}}
                  />
                  <div style={{width:'100%',display:'flex',flexDirection:'column',gap:'8px'}}>
                    {activeDebts.map((d, i) => {
                      const pct = Math.round((Number(d.balance) / totalBalance) * 100)
                      const isHovered = hoveredIndex === i
                      return (
                        <div
                          key={d.id}
                          style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 8px',borderRadius:'8px',background: isHovered ? 'var(--s2)' : 'transparent',transition:'all .15s',cursor:'pointer'}}
                          onMouseEnter={() => setHoveredIndex(i)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        >
                          <div style={{width:'10px',height:'10px',borderRadius:'2px',background:COLORS[i % COLORS.length],flexShrink:0}} />
                          <div style={{flex:1,fontSize:'12px',color:'var(--t2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</div>
                          <div style={{fontSize:'11px',fontFamily:'DM Mono,monospace',color:COLORS[i % COLORS.length]}}>{pct}%</div>
                          <div style={{fontSize:'11px',fontFamily:'DM Mono,monospace',color:'var(--t3)'}}>${Number(d.balance).toFixed(0)}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

                {/* Settings */}
                <div className="card">
                  <div className="card-head"><span className="card-title">⚙️ Settings</span></div>
                  <div className="card-body" style={{display:'flex',flexDirection:'column',gap:'14px'}}>
                    <div>
                      <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Payoff Method</div>
                      <select className="fi" value={method} onChange={e => setMethod(e.target.value)}>
                        <option value="avalanche">Avalanche (highest APR first)</option>
                        <option value="snowball">Snowball (lowest balance first)</option>
                      </select>
                    </div>
                    <div>
                      <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Extra Monthly Payment</div>
                      <input className="fi" type="number" placeholder="0.00" value={extraPayment} onChange={e => setExtraPayment(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Summary cards */}
                {payoff && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                    <div className="metric-card" style={{borderTop:'2px solid var(--green)'}}>
                      <div className="metric-label">Months to Payoff</div>
                      <div className="metric-value green">{payoff.months}</div>
                    </div>
                    <div className="metric-card" style={{borderTop:'2px solid var(--amber)'}}>
                      <div className="metric-label">Years</div>
                      <div className="metric-value amber">{(payoff.months / 12).toFixed(1)}</div>
                    </div>
                    <div className="metric-card" style={{borderTop:'2px solid var(--red)',gridColumn:'span 2'}}>
                      <div className="metric-label">Total Interest Paid</div>
                      <div className="metric-value red">${payoff.totalInterest.toFixed(2)}</div>
                    </div>
                  </div>
                )}

                {/* Payoff order */}
                <div className="card">
                  <div className="card-head"><span className="card-title">🎯 Payoff Order</span></div>
                  <div className="card-body" style={{padding:'12px'}}>
                    {sortedDebts.map((d, i) => (
                      <div key={d.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom: i < sortedDebts.length - 1 ? '1px solid var(--b)' : 'none'}}>
                        <div style={{width:'22px',height:'22px',borderRadius:'50%',background: i === 0 ? 'var(--gdim)' : 'var(--s3)',border:`1px solid ${i === 0 ? 'var(--green)' : 'var(--b)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontFamily:'DM Mono,monospace',color: i === 0 ? 'var(--green)' : 'var(--t3)',flexShrink:0}}>
                          {i + 1}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:'12px',color:'var(--t2)'}}>{d.name}</div>
                          <div style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color:'var(--t3)'}}>{d.apr}% APR · ${Number(d.min_payment).toFixed(0)}/mo</div>
                        </div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',color:'var(--red)'}}>${Number(d.balance).toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline chart */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">📈 Payoff Timeline</span>
                <div style={{display:'flex',gap:'16px',alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                    <div style={{width:'10px',height:'3px',background:'#ff5b5b',borderRadius:'2px'}} />
                    <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color:'var(--t3)'}}>Balance</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                    <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#3dffa0'}} />
                    <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color:'var(--t3)'}}>Debt Free</span>
                  </div>
                </div>
              </div>
              <div style={{padding:'16px'}}>
                <canvas ref={lineRef} style={{width:'100%',height:'220px',display:'block'}} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}