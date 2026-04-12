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

  useEffect(() => { loadDebts() }, [])

  useEffect(() => {
    if (debts.length > 0) drawChart()
  }, [debts, method, extraPayment])

  async function loadDebts() {
    const { data } = await supabase.from('debts').select('*')
    setDebts(data || [])
    setLoading(false)
  }

  function calculatePayoff() {
    let debtsCopy = debts.filter(d => !d.paid).map((d) => ({
      ...d,
      balance: Number(d.balance),
      min_payment: Number(d.min_payment),
      apr: Number(d.apr),
    }))

    if (method === 'avalanche') {
      debtsCopy.sort((a, b) => b.apr - a.apr)
    } else {
      debtsCopy.sort((a, b) => a.balance - b.balance)
    }

    const extra = parseFloat(extraPayment) || 0
    let month = 0
    let totalInterest = 0

    while (debtsCopy.some((d) => d.balance > 0) && month < 600) {
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
        const payment = Math.min(extraLeft, debtsCopy[i].balance)
        debtsCopy[i].balance -= payment
        extraLeft -= payment
        break
      }
    }

    return { months: month, totalInterest }
  }

  function drawChart() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const activeDebts = debts.filter(d => !d.paid)
    if (!activeDebts.length) return

    const dpr = window.devicePixelRatio || 1
    const size = 280
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const radius = 110
    const innerRadius = 65

    const totalBalance = activeDebts.reduce((s, d) => s + Number(d.balance), 0)

    const colors = [
      '#ff5b5b', '#ffb830', '#3dffa0', '#60a5fa', '#c084fc',
      '#f472b6', '#34d399', '#fb923c', '#a78bfa', '#38bdf8'
    ]

    ctx.clearRect(0, 0, size, size)

    let startAngle = -Math.PI / 2

    activeDebts.forEach((d, i) => {
      const slice = (Number(d.balance) / totalBalance) * Math.PI * 2
      const color = colors[i % colors.length]

      // Draw slice
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, radius, startAngle, startAngle + slice)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()

      // Gap between slices
      ctx.strokeStyle = 'rgba(13,15,14,0.8)'
      ctx.lineWidth = 2
      ctx.stroke()

      startAngle += slice
    })

    // Donut hole
    ctx.beginPath()
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2)
    ctx.fillStyle = 'var(--bg, #0d0f0e)'
    ctx.fill()

    // Center text
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ff5b5b'
    ctx.font = `bold 18px DM Mono, monospace`
    ctx.fillText(`$${totalBalance >= 1000 ? (totalBalance / 1000).toFixed(0) + 'k' : totalBalance.toFixed(0)}`, cx, cy - 6)
    ctx.fillStyle = 'rgba(182,193,188,0.8)'
    ctx.font = `10px DM Mono, monospace`
    ctx.fillText('total debt', cx, cy + 12)
  }

  const activeDebts = debts.filter(d => !d.paid)
  const payoff = activeDebts.length > 0 ? calculatePayoff() : null
  const totalBalance = activeDebts.reduce((s, d) => s + Number(d.balance), 0)

  const colors = [
    '#ff5b5b', '#ffb830', '#3dffa0', '#60a5fa', '#c084fc',
    '#f472b6', '#34d399', '#fb923c', '#a78bfa', '#38bdf8'
  ]

  const sortedDebts = [...activeDebts].sort((a, b) =>
    method === 'avalanche' ? Number(b.apr) - Number(a.apr) : Number(a.balance) - Number(b.balance)
  )

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <div className="page-title">Snowball</div>
          <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'8px'}}>Calculate your debt payoff plan and timeline</div>
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
                    <select className="fi" value={method} onChange={(e) => setMethod(e.target.value)}>
                      <option value="avalanche">Avalanche (highest APR first)</option>
                      <option value="snowball">Snowball (lowest balance first)</option>
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Extra Monthly Payment</div>
                    <input className="fi" type="number" placeholder="0.00" value={extraPayment} onChange={(e) => setExtraPayment(e.target.value)} />
                  </div>
                </div>
              </div>

              {payoff && (
                <div className="card">
                  <div className="card-head"><span className="card-title">📊 Payoff Summary</span></div>
                  <div className="card-body" style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                    <div className="metric-card" style={{borderTop:'2px solid var(--green)'}}>
                      <div className="metric-label">Months to Payoff</div>
                      <div className="metric-value green">{payoff.months}</div>
                    </div>
                    <div className="metric-card" style={{borderTop:'2px solid var(--amber)'}}>
                      <div className="metric-label">Years to Payoff</div>
                      <div className="metric-value amber">{(payoff.months / 12).toFixed(1)}</div>
                    </div>
                    <div className="metric-card" style={{borderTop:'2px solid var(--red)'}}>
                      <div className="metric-label">Total Interest Paid</div>
                      <div className="metric-value red">${payoff.totalInterest.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pie Chart + Legend */}
            <div className="card" style={{marginBottom:'16px'}}>
              <div className="card-head">
                <span className="card-title">🥧 Debt Breakdown</span>
                <span style={{fontSize:'11px',fontFamily:'DM Mono,monospace',color:'var(--t3)'}}>{activeDebts.length} debts</span>
              </div>
              <div style={{padding:'24px',display:'flex',gap:'32px',alignItems:'center',flexWrap:'wrap'}}>
                <canvas ref={canvasRef} />
                <div style={{flex:1,minWidth:'200px',display:'flex',flexDirection:'column',gap:'10px'}}>
                  {activeDebts.map((d, i) => {
                    const pct = Math.round((Number(d.balance) / totalBalance) * 100)
                    return (
                      <div key={d.id} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        <div style={{width:'12px',height:'12px',borderRadius:'3px',background:colors[i % colors.length],flexShrink:0}} />
                        <div style={{flex:1}}>
                          <div style={{fontSize:'13px',color:'var(--t2)'}}>{d.name}</div>
                          <div style={{fontSize:'11px',fontFamily:'DM Mono,monospace',color:'var(--t3)'}}>${Number(d.balance).toFixed(2)} · {pct}%</div>
                        </div>
                        <div style={{fontSize:'11px',fontFamily:'DM Mono,monospace',color:'var(--amber)'}}>{d.apr}% APR</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><span className="card-title">🎯 Payoff Order</span></div>
              <div className="card-body">
                {sortedDebts.map((d, i) => (
                  <div key={d.id} className="row-item">
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <div style={{width:'24px',height:'24px',borderRadius:'50%',background: i === 0 ? 'var(--gdim)' : 'var(--s3)',border:`1px solid ${i === 0 ? 'var(--green)' : 'var(--b)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontFamily:'DM Mono,monospace',color: i === 0 ? 'var(--green)' : 'var(--t3)',flexShrink:0}}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={{fontSize:'13px'}}>{d.name}</div>
                        <div style={{fontSize:'11px',fontFamily:'DM Mono,monospace',color:'var(--t3)'}}>
                          {method === 'avalanche' ? `${d.apr}% APR` : `$${Number(d.balance).toFixed(0)} balance`}
                        </div>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div className="mono red">${Number(d.balance).toFixed(2)}</div>
                      <div style={{fontSize:'11px',fontFamily:'DM Mono,monospace',color:'var(--amber)'}}>${Number(d.min_payment).toFixed(0)}/mo</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}