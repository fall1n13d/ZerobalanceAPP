'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

const COLORS = ['#c084fc','#60a5fa','#f472b6','#34d399','#fb923c','#ff5b5b','#ffb830','#38bdf8','#a78bfa','#3dffa0']

function getMonthLabel(monthsFromNow: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + monthsFromNow)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function SnowballPage() {
  const supabase = createClient()
  const [debts, setDebts] = useState<any[]>([])
  const [extraPayment, setExtraPayment] = useState('0')
  const [method, setMethod] = useState('avalanche')
  const [loading, setLoading] = useState(true)
  const [expandedMonth, setExpandedMonth] = useState<number | null>(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tooltip, setTooltip] = useState<any>(null)

  useEffect(() => {
    loadDebts()
    window.addEventListener('debt-updated', loadDebts)
    return () => window.removeEventListener('debt-updated', loadDebts)
  }, [])

  useEffect(() => {
    if (debts.length > 0) drawChart()
  }, [debts, method, extraPayment])

  async function loadDebts() {
    const { data } = await supabase.from('debts').select('*')
    setDebts(data || [])
    setLoading(false)
  }

  function runSimulation(methodOverride?: string) {
    const m = methodOverride || method
    let debtsCopy = debts.filter(d => !d.paid).map(d => ({
      id: d.id, name: d.name,
      balance: Number(d.balance),
      min_payment: Number(d.min_payment),
      apr: Number(d.apr),
    }))
    if (m === 'avalanche') debtsCopy.sort((a, b) => b.apr - a.apr)
    else if (m === 'snowball') debtsCopy.sort((a, b) => a.balance - b.balance)

    const extra = parseFloat(extraPayment) || 0
    let month = 0
    let totalInterest = 0
    const monthlyData: { month: number, label: string, total: number, perDebt: {id: number, name: string, balance: number, payment: number}[], interest: number }[] = []
    const perDebtBalances: Record<number, number[]> = {}
    debtsCopy.forEach(d => { perDebtBalances[d.id] = [d.balance] })

    const startTotal = debtsCopy.reduce((s, d) => s + d.balance, 0)

    while (debtsCopy.some(d => d.balance > 0) && month < 600) {
      month++
      let extraLeft = extra
      let monthInterest = 0
      const perDebt: any[] = []

      // Apply interest
      for (let i = 0; i < debtsCopy.length; i++) {
        if (debtsCopy[i].balance <= 0) continue
        const interest = (debtsCopy[i].balance * (debtsCopy[i].apr / 100)) / 12
        monthInterest += interest
        totalInterest += interest
        debtsCopy[i].balance += interest
      }

      // Apply min payments
      for (let i = 0; i < debtsCopy.length; i++) {
        if (debtsCopy[i].balance <= 0) continue
        const pay = Math.min(debtsCopy[i].min_payment, debtsCopy[i].balance)
        debtsCopy[i].balance -= pay
        if (debtsCopy[i].balance < 0) debtsCopy[i].balance = 0
        perDebt.push({ id: debtsCopy[i].id, name: debtsCopy[i].name, balance: debtsCopy[i].balance, payment: pay })
      }

      // Apply extra to target debt
      for (let i = 0; i < debtsCopy.length; i++) {
        if (debtsCopy[i].balance <= 0) continue
        const pay = Math.min(extraLeft, debtsCopy[i].balance)
        debtsCopy[i].balance -= pay; extraLeft -= pay
        const found = perDebt.find(p => p.id === debtsCopy[i].id)
        if (found) found.payment += pay
        break
      }

      debtsCopy.forEach(d => { perDebtBalances[d.id].push(Math.max(0, d.balance)) })
      const total = debtsCopy.reduce((s, d) => s + Math.max(0, d.balance), 0)
      monthlyData.push({ month, label: getMonthLabel(month), total: Math.max(0, total), perDebt, interest: monthInterest })
    }

    return { months: month, totalInterest, monthlyData, perDebtBalances, startTotal }
  }

  function drawChart() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const w = rect.width, h = rect.height
    const pad = { top: 30, right: 20, bottom: 56, left: 68 }
    const cw = w - pad.left - pad.right
    const ch = h - pad.top - pad.bottom

    const { perDebtBalances, monthlyData, startTotal } = runSimulation()
    const total = monthlyData.length + 1
    if (total < 2) return

    const maxVal = startTotal
    ctx.clearRect(0, 0, w, h)

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, 'rgba(22,25,24,0.3)')
    bg.addColorStop(1, 'rgba(13,15,14,0)')
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)

    // Grid
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (ch / 5) * i
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1; ctx.setLineDash([4,6])
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke()
      ctx.setLineDash([])
      const val = maxVal - (maxVal / 5) * i
      ctx.fillStyle = 'rgba(182,193,188,0.5)'
      ctx.font = '9px DM Mono, monospace'; ctx.textAlign = 'right'
      ctx.fillText(`$${val >= 1000 ? (val/1000).toFixed(0)+'k' : val.toFixed(0)}`, pad.left - 6, y + 3)
    }

    // X axis date labels
    const labelCount = Math.min(7, total - 1)
    for (let i = 0; i <= labelCount; i++) {
      const idx = Math.round((total - 1) / labelCount * i)
      const x = pad.left + (cw / (total - 1)) * idx
      ctx.fillStyle = 'rgba(182,193,188,0.5)'
      ctx.font = '9px DM Mono, monospace'; ctx.textAlign = 'center'
      ctx.fillText(getMonthLabel(idx), x, h - 10)
    }

    // Draw each debt line
    const activeDebts = debts.filter(d => !d.paid)
    activeDebts.forEach((debt, di) => {
      const balances = perDebtBalances[debt.id]
      if (!balances) return
      const color = COLORS[di % COLORS.length]

      // Fill area
      ctx.beginPath()
      ctx.moveTo(pad.left, pad.top + ch)
      balances.forEach((val, i) => {
        const x = pad.left + (cw / (total - 1)) * i
        const y = pad.top + ch - (val / maxVal) * ch
        i === 0 ? ctx.lineTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.lineTo(pad.left + cw, pad.top + ch)
      ctx.closePath()
      ctx.fillStyle = color.replace(')', ', 0.08)').replace('rgb', 'rgba').replace('#', 'rgba(').replace('rgba(', 'rgba(')
      // Simple opacity
      ctx.globalAlpha = 0.08
      ctx.fillStyle = color
      ctx.fill()
      ctx.globalAlpha = 1

      // Line
      ctx.beginPath()
      balances.forEach((val, i) => {
        const x = pad.left + (cw / (total - 1)) * i
        const y = pad.top + ch - (val / maxVal) * ch
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      ctx.stroke()
    })

    // Total balance line
    const totalBalances = [startTotal, ...monthlyData.map(m => m.total)]
    ctx.beginPath()
    totalBalances.forEach((val, i) => {
      const x = pad.left + (cw / (total - 1)) * i
      const y = pad.top + ch - (val / maxVal) * ch
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([6,4]); ctx.stroke(); ctx.setLineDash([])

    // End glow dot
    ctx.shadowColor = '#3dffa0'; ctx.shadowBlur = 14
    ctx.beginPath(); ctx.arc(pad.left + cw, pad.top + ch, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#3dffa0'; ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#3dffa0'; ctx.font = 'bold 9px DM Mono, monospace'; ctx.textAlign = 'center'
    ctx.fillText('$0', pad.left + cw, pad.top + ch - 12)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const w = rect.width
    const pad = { left: 68, right: 20, bottom: 56, top: 30 }
    const cw = w - pad.left - pad.right
    if (mouseX < pad.left || mouseX > pad.left + cw) { setTooltip(null); return }
    const { monthlyData } = runSimulation()
    const total = monthlyData.length + 1
    const idx = Math.max(0, Math.min(total - 2, Math.round(((mouseX - pad.left) / cw) * (total - 1)) - 1))
    const m = monthlyData[idx]
    if (!m) { setTooltip(null); return }
    setTooltip({ x: mouseX, month: m.month, label: m.label, total: m.total, interest: m.interest, perDebt: m.perDebt })
  }

  const activeDebts = debts.filter(d => !d.paid)
  const sim = activeDebts.length > 0 ? runSimulation() : null
  const simAvalanche = activeDebts.length > 0 ? runSimulation('avalanche') : null
  const simSnowball = activeDebts.length > 0 ? runSimulation('snowball') : null
  const totalBalance = activeDebts.reduce((s, d) => s + Number(d.balance), 0)
  const totalMin = activeDebts.reduce((s, d) => s + Number(d.min_payment), 0)
  const debtFreeDate = sim ? getMonthLabel(sim.months) : '—'

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <div className="page-title">Snowball</div>
          <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'8px'}}>Payoff strategy · Timeline · Payment schedule</div>
        </div>

        {loading ? <p style={{color:'var(--t3)'}}>Loading...</p> : activeDebts.length === 0 ? (
          <div className="card"><div className="card-body"><p style={{color:'var(--t3)'}}>No active debts. <Link href="/debts" style={{color:'var(--green)'}}>Add some debts first.</Link></p></div></div>
        ) : (
          <>
            {/* Strategy comparison */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
              {[
                {key:'avalanche', label:'Avalanche', desc:'Pays highest APR first', sim: simAvalanche},
                {key:'snowball', label:'Snowball', desc:'Pays lowest balance first', sim: simSnowball},
              ].map(s => (
                <div
                  key={s.key}
                  onClick={() => setMethod(s.key)}
                  style={{background:'var(--card-bg)',border:`1px solid ${method === s.key ? 'var(--green)' : 'var(--b)'}`,borderRadius:'16px',padding:'18px',cursor:'pointer',transition:'all .15s',boxShadow: method === s.key ? '0 0 20px var(--gdim)' : 'var(--shadow)',position:'relative'}}
                >
                  {method === s.key && (
                    <span style={{position:'absolute',top:'12px',right:'12px',fontSize:'10px',fontFamily:'DM Mono,monospace',background:'var(--gdim)',color:'var(--green)',border:'1px solid var(--green)',borderRadius:'999px',padding:'2px 8px'}}>Selected</span>
                  )}
                  <div style={{fontSize:'16px',fontFamily:'Syne,sans-serif',fontWeight:700,marginBottom:'4px'}}>{s.label}</div>
                  <div style={{fontSize:'11px',color:'var(--t3)',marginBottom:'12px'}}>{s.desc}</div>
                  <div style={{display:'flex',gap:'16px',flexWrap:'wrap'}}>
                    <div>
                      <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',marginBottom:'2px'}}>Total Interest</div>
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'18px',fontWeight:600,color:'var(--red)'}}>${s.sim?.totalInterest.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',marginBottom:'2px'}}>Months</div>
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'18px',fontWeight:600,color:'var(--amber)'}}>{s.sim?.months}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary bar */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'16px'}}>
              <div className="metric-card" style={{borderTop:'2px solid var(--red)'}}>
                <div className="metric-label">Total Debt</div>
                <div className="metric-value red">${totalBalance.toFixed(2)}</div>
              </div>
              <div className="metric-card" style={{borderTop:'2px solid var(--blue)'}}>
                <div className="metric-label">Debt Free By</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'16px',fontWeight:500,color:'var(--blue)'}}>{debtFreeDate}</div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',marginTop:'2px'}}>{sim?.months} months</div>
              </div>
              <div className="metric-card" style={{borderTop:'2px solid var(--purple)'}}>
                <div className="metric-label">Total Interest</div>
                <div className="metric-value" style={{color:'var(--purple)'}}>${sim?.totalInterest.toFixed(2)}</div>
              </div>
              <div className="metric-card" style={{borderTop:'2px solid var(--amber)'}}>
                <div className="metric-label">Monthly Minimum</div>
                <div className="metric-value amber">${totalMin.toFixed(2)}</div>
              </div>
            </div>

            {/* Extra payment + chart + schedule */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:'16px',marginBottom:'16px'}}>

              {/* Chart */}
              <div className="card">
                <div className="card-head">
                  <span className="card-title">📈 Payoff Timeline</span>
                  <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                    {activeDebts.map((d, i) => (
                      <div key={d.id} style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <div style={{width:'8px',height:'8px',borderRadius:'50%',background:COLORS[i % COLORS.length]}} />
                        <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color:'var(--t3)'}}>{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{padding:'8px 16px',borderBottom:'1px solid var(--b)',display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{fontSize:'11px',color:'var(--t3)',fontFamily:'DM Mono,monospace'}}>Monthly Budget:</span>
                  <div style={{display:'flex',alignItems:'center',background:'var(--s2)',border:'1px solid var(--b2)',borderRadius:'10px',overflow:'hidden'}}>
                    <span style={{padding:'6px 10px',fontFamily:'DM Mono,monospace',fontSize:'14px',color:'var(--green)',borderRight:'1px solid var(--b)'}}>$</span>
                    <input
                      type="number"
                      value={extraPayment}
                      onChange={e => setExtraPayment(e.target.value)}
                      style={{background:'transparent',border:'none',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:'16px',fontWeight:500,padding:'6px 10px',outline:'none',width:'100px'}}
                      placeholder="0"
                    />
                  </div>
                  <span style={{fontSize:'11px',color:'var(--t3)',fontFamily:'DM Mono,monospace'}}>Min ${totalMin.toFixed(0)}/mo required</span>
                </div>
                <div style={{padding:'12px 16px',position:'relative'}}>
                  <canvas
                    ref={canvasRef}
                    style={{width:'100%',height:'280px',display:'block'}}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setTooltip(null)}
                  />
                  {tooltip && (
                    <div style={{position:'absolute',left:Math.min(tooltip.x + 12, 400),top:'20px',background:'var(--surface)',border:'1px solid var(--b2)',borderRadius:'12px',padding:'10px 14px',fontSize:'11px',fontFamily:'DM Mono,monospace',pointerEvents:'none',zIndex:10,boxShadow:'var(--shadow)',minWidth:'180px'}}>
                      <div style={{color:'var(--t2)',fontWeight:600,marginBottom:'6px'}}>{tooltip.label}</div>
                      <div style={{color:'var(--t3)',marginBottom:'4px'}}>Remaining: <span style={{color:'var(--red)'}}>${tooltip.total.toFixed(2)}</span></div>
                      <div style={{color:'var(--t3)',marginBottom:'6px'}}>Interest: <span style={{color:'var(--purple)'}}>${tooltip.interest.toFixed(2)}</span></div>
                      {tooltip.perDebt?.map((p: any, i: number) => (
                        <div key={i} style={{display:'flex',justifyContent:'space-between',gap:'12px',color:'var(--t3)',fontSize:'10px'}}>
                          <span>{p.name}</span>
                          <span style={{color:'var(--t2)'}}>${p.balance.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Schedule */}
              <div className="card" style={{maxHeight:'480px',display:'flex',flexDirection:'column'}}>
                <div className="card-head" style={{flexShrink:0}}>
                  <span className="card-title">📅 Payment Schedule</span>
                </div>
                <div style={{overflowY:'auto',flex:1}}>
                  {sim?.monthlyData.slice(0, 24).map((m, idx) => (
                    <div key={m.month} style={{borderBottom:'1px solid var(--b)'}}>
                      <div
                        style={{padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',background: expandedMonth === idx ? 'var(--s2)' : 'transparent'}}
                        onClick={() => setExpandedMonth(expandedMonth === idx ? null : idx)}
                      >
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <span style={{fontSize:'12px',color:'var(--t2)',fontWeight:500}}>{m.label}</span>
                          {idx === 0 && <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',background:'var(--gdim)',color:'var(--green)',border:'1px solid var(--green)',borderRadius:'999px',padding:'1px 6px'}}>Now</span>}
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px',color:'var(--amber)'}}>${(totalMin + (parseFloat(extraPayment)||0)).toFixed(2)}</span>
                          <span style={{color:'var(--t3)',fontSize:'10px'}}>{expandedMonth === idx ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      {expandedMonth === idx && (
                        <div style={{padding:'8px 14px 12px',background:'var(--s2)'}}>
                          {m.perDebt.map((p: any, i: number) => (
                            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:'11px',fontFamily:'DM Mono,monospace'}}>
                              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                                <div style={{width:'6px',height:'6px',borderRadius:'50%',background:COLORS[activeDebts.findIndex(d => d.id === p.id) % COLORS.length]}} />
                                <span style={{color:'var(--t2)'}}>{p.name}</span>
                              </div>
                              <span style={{color:'var(--green)'}}>${p.payment.toFixed(2)}</span>
                            </div>
                          ))}
                          <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0 0',fontSize:'11px',fontFamily:'DM Mono,monospace',borderTop:'1px solid var(--b)',marginTop:'4px'}}>
                            <span style={{color:'var(--t3)'}}>Remaining</span>
                            <span style={{color:'var(--red)'}}>${m.total.toFixed(2)}</span>
                          </div>
                          <div style={{display:'flex',justifyContent:'space-between',padding:'2px 0',fontSize:'11px',fontFamily:'DM Mono,monospace'}}>
                            <span style={{color:'var(--t3)'}}>Interest</span>
                            <span style={{color:'var(--purple)'}}>${m.interest.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Debt list */}
            <div className="card">
              <div className="card-head"><span className="card-title">💳 Your Debts</span></div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',minWidth:'500px'}}>
                  <thead>
                    <tr>
                      {['','Name','Balance','Min Payment','APR %','Payoff Order'].map(h => (
                        <th key={h} style={{padding:'10px 16px',fontSize:'10px',fontWeight:600,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.09em',fontFamily:'DM Mono,monospace',textAlign:'left',background:'var(--s2)',borderBottom:'1px solid var(--b)'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeDebts.map((d, i) => {
                      const order = method === 'avalanche'
                        ? [...activeDebts].sort((a,b) => Number(b.apr) - Number(a.apr)).findIndex(x => x.id === d.id)
                        : [...activeDebts].sort((a,b) => Number(a.balance) - Number(b.balance)).findIndex(x => x.id === d.id)
                      return (
                        <tr key={d.id} style={{background: i % 2 === 0 ? 'var(--s2)' : 'transparent'}}>
                          <td style={{padding:'10px 16px',borderBottom:'1px solid var(--b)'}}>
                            <div style={{width:'10px',height:'10px',borderRadius:'2px',background:COLORS[i % COLORS.length]}} />
                          </td>
                          <td style={{padding:'10px 16px',fontSize:'13px',borderBottom:'1px solid var(--b)'}}>{d.name}</td>
                          <td style={{padding:'10px 16px',fontSize:'13px',fontFamily:'DM Mono,monospace',color:'var(--red)',borderBottom:'1px solid var(--b)'}}>${Number(d.balance).toFixed(2)}</td>
                          <td style={{padding:'10px 16px',fontSize:'13px',fontFamily:'DM Mono,monospace',color:'var(--amber)',borderBottom:'1px solid var(--b)'}}>${Number(d.min_payment).toFixed(2)}</td>
                          <td style={{padding:'10px 16px',fontSize:'13px',fontFamily:'DM Mono,monospace',color:'var(--amber)',borderBottom:'1px solid var(--b)'}}>{d.apr}%</td>
                          <td style={{padding:'10px 16px',borderBottom:'1px solid var(--b)'}}>
                            <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                              <div style={{width:'20px',height:'20px',borderRadius:'50%',background: order === 0 ? 'var(--gdim)' : 'var(--s3)',border:`1px solid ${order === 0 ? 'var(--green)' : 'var(--b)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontFamily:'DM Mono,monospace',color: order === 0 ? 'var(--green)' : 'var(--t3)'}}>
                                {order + 1}
                              </div>
                              {order === 0 && <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color:'var(--green)'}}>Pay first</span>}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
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