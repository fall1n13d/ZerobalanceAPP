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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tooltip, setTooltip] = useState<{x:number,y:number,month:number,balance:number,interest:number} | null>(null)

  useEffect(() => {
    loadDebts()
    window.addEventListener('debt-updated', loadDebts)
    return () => window.removeEventListener('debt-updated', loadDebts)
  }, [])

  useEffect(() => { if (debts.length > 0) drawChart() }, [debts, method, extraPayment])

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
    let month = 0
    let totalInterest = 0
    const monthlyBalance: number[] = []
    const monthlyInterest: number[] = []
    const startBalance = debtsCopy.reduce((s, d) => s + d.balance, 0)
    monthlyBalance.push(startBalance)
    monthlyInterest.push(0)

    while (debtsCopy.some(d => d.balance > 0) && month < 600) {
      month++
      let extraLeft = extra
      let monthInterest = 0

      for (let i = 0; i < debtsCopy.length; i++) {
        if (debtsCopy[i].balance <= 0) continue
        const interest = (debtsCopy[i].balance * (debtsCopy[i].apr / 100)) / 12
        monthInterest += interest
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

      monthlyBalance.push(debtsCopy.reduce((s, d) => s + Math.max(0, d.balance), 0))
      monthlyInterest.push(totalInterest)
    }

    return { months: month, totalInterest, monthlyBalance, monthlyInterest, startBalance }
  }

  function drawChart() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const w = rect.width, h = rect.height
    const pad = { top: 30, right: 30, bottom: 48, left: 72 }
    const cw = w - pad.left - pad.right, ch = h - pad.top - pad.bottom

    const { monthlyBalance, monthlyInterest, totalInterest, startBalance } = calculatePayoff()
    const total = monthlyBalance.length
    if (total < 2) return

    const maxVal = Math.max(startBalance, totalInterest, 1)
    ctx.clearRect(0, 0, w, h)

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
    bgGrad.addColorStop(0, 'rgba(22,25,24,0.4)')
    bgGrad.addColorStop(1, 'rgba(13,15,14,0)')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, w, h)

    // Grid lines
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (ch / 5) * i
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 6])
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke()
      ctx.setLineDash([])
      const val = maxVal - (maxVal / 5) * i
      ctx.fillStyle = 'rgba(182,193,188,0.5)'
      ctx.font = '10px DM Mono, monospace'; ctx.textAlign = 'right'
      ctx.fillText(`$${val >= 1000 ? (val/1000).toFixed(0)+'k' : val.toFixed(0)}`, pad.left - 8, y + 3)
    }

    // Vertical grid lines
    const vCount = Math.min(6, total - 1)
    for (let i = 0; i <= vCount; i++) {
      const mo = Math.round((total - 1) / vCount * i)
      const x = pad.left + (cw / (total - 1)) * mo
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 6])
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + ch); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(182,193,188,0.5)'
      ctx.font = '10px DM Mono, monospace'; ctx.textAlign = 'center'
      ctx.fillText(`${mo}mo`, x, h - 10)
    }

    // Y axis label
    ctx.save()
    ctx.translate(14, pad.top + ch / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = 'rgba(182,193,188,0.4)'
    ctx.font = '10px DM Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('$ Amount', 0, 0)
    ctx.restore()

    // Balance fill
    const balGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch)
    balGrad.addColorStop(0, 'rgba(255,91,91,0.18)')
    balGrad.addColorStop(0.6, 'rgba(255,184,48,0.08)')
    balGrad.addColorStop(1, 'rgba(61,255,160,0.02)')
    ctx.beginPath()
    ctx.moveTo(pad.left, pad.top + ch)
    monthlyBalance.forEach((val, i) => {
      const x = pad.left + (cw / (total - 1)) * i
      const y = pad.top + ch - (val / maxVal) * ch
      i === 0 ? ctx.lineTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.lineTo(pad.left + cw, pad.top + ch)
    ctx.closePath()
    ctx.fillStyle = balGrad; ctx.fill()

    // Balance line
    const balLineGrad = ctx.createLinearGradient(pad.left, 0, pad.left + cw, 0)
    balLineGrad.addColorStop(0, '#ff5b5b')
    balLineGrad.addColorStop(0.5, '#ffb830')
    balLineGrad.addColorStop(1, '#3dffa0')
    ctx.beginPath()
    monthlyBalance.forEach((val, i) => {
      const x = pad.left + (cw / (total - 1)) * i
      const y = pad.top + ch - (val / maxVal) * ch
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = balLineGrad; ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'; ctx.stroke()

    // Interest cumulative line
    ctx.beginPath()
    monthlyInterest.forEach((val, i) => {
      const x = pad.left + (cw / (total - 1)) * i
      const y = pad.top + ch - (val / maxVal) * ch
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = 'rgba(192,132,252,0.7)'; ctx.lineWidth = 2
    ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([])

    // Find intersection of balance and interest lines
    let intersectMonth = -1
    for (let i = 1; i < total; i++) {
      if (monthlyInterest[i] >= monthlyBalance[i] && monthlyInterest[i-1] < monthlyBalance[i-1]) {
        intersectMonth = i; break
      }
    }

    if (intersectMonth > 0) {
      const ix = pad.left + (cw / (total - 1)) * intersectMonth
      const iy = pad.top + ch - (monthlyBalance[intersectMonth] / maxVal) * ch
      // Vertical line at intersection
      ctx.strokeStyle = 'rgba(255,184,48,0.4)'
      ctx.lineWidth = 1; ctx.setLineDash([3, 4])
      ctx.beginPath(); ctx.moveTo(ix, pad.top); ctx.lineTo(ix, pad.top + ch); ctx.stroke()
      ctx.setLineDash([])
      // Dot
      ctx.shadowColor = '#ffb830'; ctx.shadowBlur = 12
      ctx.beginPath(); ctx.arc(ix, iy, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#ffb830'; ctx.fill()
      ctx.shadowBlur = 0
      // Label
      ctx.fillStyle = '#ffb830'
      ctx.font = 'bold 10px DM Mono, monospace'; ctx.textAlign = 'center'
      ctx.fillText('Interest > Balance', ix, iy - 14)
    }

    // Payoff date marker
    const lastX = pad.left + cw
    const lastY = pad.top + ch
    ctx.shadowColor = '#3dffa0'; ctx.shadowBlur = 16
    ctx.beginPath(); ctx.arc(lastX, lastY, 7, 0, Math.PI * 2)
    ctx.fillStyle = '#3dffa0'; ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#3dffa0'; ctx.font = 'bold 10px DM Mono, monospace'; ctx.textAlign = 'center'
    ctx.fillText('DEBT FREE', lastX, lastY - 14)

    // Start dot
    const sy = pad.top + ch - (monthlyBalance[0] / maxVal) * ch
    ctx.shadowColor = '#ff5b5b'; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.arc(pad.left, sy, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#ff5b5b'; ctx.fill()
    ctx.shadowBlur = 0
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const w = rect.width, h = rect.height
    const pad = { top: 30, right: 30, bottom: 48, left: 72 }
    const cw = w - pad.left - pad.right, ch = h - pad.top - pad.bottom
    if (mouseX < pad.left || mouseX > pad.left + cw) { setTooltip(null); return }
    const { monthlyBalance, monthlyInterest } = calculatePayoff()
    const total = monthlyBalance.length
    const idx = Math.round(((mouseX - pad.left) / cw) * (total - 1))
    if (idx < 0 || idx >= total) { setTooltip(null); return }
    const maxVal = Math.max(monthlyBalance[0], monthlyInterest[monthlyInterest.length-1], 1)
    const x = pad.left + (cw / (total - 1)) * idx
    const y = pad.top + ch - (monthlyBalance[idx] / maxVal) * ch
    setTooltip({ x: e.clientX - rect.left, y, month: idx, balance: monthlyBalance[idx], interest: monthlyInterest[idx] })
  }

  const activeDebts = debts.filter(d => !d.paid)
  const payoff = activeDebts.length > 0 ? calculatePayoff() : null
  const sortedDebts = [...activeDebts].sort((a, b) =>
    method === 'avalanche' ? Number(b.apr) - Number(a.apr) : Number(a.balance) - Number(b.balance)
  )

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <div className="page-title">Snowball</div>
          <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'8px'}}>Payoff timeline · Interest tracking · Strategy · Updates live with payments</div>
        </div>

        {loading ? <p style={{color:'var(--t3)'}}>Loading...</p> : activeDebts.length === 0 ? (
          <div className="card">
            <div className="card-body">
              <p style={{color:'var(--t3)'}}>No active debts. <Link href="/debts" style={{color:'var(--green)'}}>Add some debts first.</Link></p>
            </div>
          </div>
        ) : (
          <>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
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
                  <div className="metric-card" style={{borderTop:'2px solid var(--blue)',gridColumn:'span 2'}}>
                    <div className="metric-label">Starting Balance</div>
                    <div className="metric-value" style={{color:'var(--blue)'}}>${payoff.startBalance.toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Main Chart */}
            <div className="card" style={{marginBottom:'16px'}}>
              <div className="card-head">
                <span className="card-title">📈 Payoff Timeline</span>
                <div style={{display:'flex',gap:'16px',alignItems:'center',flexWrap:'wrap'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                    <div style={{width:'16px',height:'3px',background:'linear-gradient(90deg,#ff5b5b,#3dffa0)',borderRadius:'2px'}} />
                    <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color:'var(--t3)'}}>Balance</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                    <div style={{width:'16px',height:'3px',background:'rgba(192,132,252,0.7)',borderRadius:'2px',borderTop:'2px dashed rgba(192,132,252,0.7)'}} />
                    <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color:'var(--t3)'}}>Cumulative Interest</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                    <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#ffb830'}} />
                    <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color:'var(--t3)'}}>Interest &gt; Balance</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                    <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#3dffa0'}} />
                    <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color:'var(--t3)'}}>Debt Free</span>
                  </div>
                </div>
              </div>
              <div style={{padding:'16px',position:'relative'}}>
                <canvas
                  ref={canvasRef}
                  style={{width:'100%',height:'300px',display:'block'}}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setTooltip(null)}
                />
                {tooltip && (
                  <div style={{position:'absolute',left: Math.min(tooltip.x + 12, 500),top: tooltip.y - 10,background:'var(--surface)',border:'1px solid var(--b2)',borderRadius:'10px',padding:'8px 12px',fontSize:'11px',fontFamily:'DM Mono,monospace',pointerEvents:'none',zIndex:10,boxShadow:'var(--shadow)'}}>
                    <div style={{color:'var(--t3)',marginBottom:'4px'}}>Month {tooltip.month}</div>
                    <div style={{color:'var(--red)'}}>Balance: ${tooltip.balance.toFixed(2)}</div>
                    <div style={{color:'var(--purple)'}}>Interest paid: ${tooltip.interest.toFixed(2)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Payoff order */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">🎯 Payoff Order</span>
                <span style={{fontSize:'11px',fontFamily:'DM Mono,monospace',color:'var(--t3)'}}>{method === 'avalanche' ? 'Highest APR first' : 'Lowest balance first'}</span>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',minWidth:'500px'}}>
                  <thead>
                    <tr>
                      {['#','Name','Balance','Min Payment','APR %'].map(h => (
                        <th key={h} style={{padding:'10px 16px',fontSize:'10px',fontWeight:600,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.09em',fontFamily:'DM Mono,monospace',textAlign:'left',background:'var(--s2)',borderBottom:'1px solid var(--b)'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDebts.map((d, i) => (
                      <tr key={d.id} style={{background: i % 2 === 0 ? 'var(--s2)' : 'transparent'}}>
                        <td style={{padding:'10px 16px',borderBottom:'1px solid var(--b)'}}>
                          <div style={{width:'22px',height:'22px',borderRadius:'50%',background: i === 0 ? 'var(--gdim)' : 'var(--s3)',border:`1px solid ${i === 0 ? 'var(--green)' : 'var(--b)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontFamily:'DM Mono,monospace',color: i === 0 ? 'var(--green)' : 'var(--t3)'}}>
                            {i + 1}
                          </div>
                        </td>
                        <td style={{padding:'10px 16px',fontSize:'13px',borderBottom:'1px solid var(--b)'}}>{d.name}</td>
                        <td style={{padding:'10px 16px',fontSize:'13px',fontFamily:'DM Mono,monospace',color:'var(--red)',borderBottom:'1px solid var(--b)'}}>${Number(d.balance).toFixed(2)}</td>
                        <td style={{padding:'10px 16px',fontSize:'13px',fontFamily:'DM Mono,monospace',color:'var(--amber)',borderBottom:'1px solid var(--b)'}}>${Number(d.min_payment).toFixed(2)}</td>
                        <td style={{padding:'10px 16px',fontSize:'13px',fontFamily:'DM Mono,monospace',color:'var(--amber)',borderBottom:'1px solid var(--b)'}}>{d.apr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}