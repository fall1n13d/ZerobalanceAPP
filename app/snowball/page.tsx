'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function SnowballPage() {
  const supabase = createClient()
  const [debts, setDebts] = useState<any[]>([])
  const [extraPayment, setExtraPayment] = useState('')
  const [method, setMethod] = useState('avalanche')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDebts() }, [])

  async function loadDebts() {
    const { data } = await supabase.from('debts').select('*')
    setDebts(data || [])
    setLoading(false)
  }

  function calculatePayoff() {
    let debtsCopy = debts.map((d) => ({
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

  const payoff = debts.length > 0 ? calculatePayoff() : null
  const sortedDebts = [...debts].sort((a, b) =>
    method === 'avalanche' ? Number(b.apr) - Number(a.apr) : Number(a.balance) - Number(b.balance)
  )

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-name">Zero Balance</div>
          <div className="logo-sub">Debt Freedom System</div>
        </div>
        <nav className="nav-links">
          <Link href="/debts" className="nav-item">💳 My Debts</Link>
          <Link href="/budget" className="nav-item">💰 Budget</Link>
          <Link href="/records" className="nav-item">📋 Records</Link>
          <Link href="/snowball" className="nav-item active">❄️ Snowball</Link>
        </nav>
        <div className="nav-logout">
          <Link href="/login" className="btn-logout" style={{display:'block',textAlign:'center',textDecoration:'none'}}>Sign Out</Link>
        </div>
      </aside>
      <main className="main">
        <div className="page-header">
          <div className="page-title">Snowball</div>
          <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'8px'}}>Calculate your debt payoff plan</div>
        </div>

        {loading ? <p style={{color:'var(--t3)'}}>Loading...</p> : debts.length === 0 ? (
          <div className="card">
            <div className="card-body">
              <p style={{color:'var(--t3)'}}>No debts found. <Link href="/debts" style={{color:'var(--green)'}}>Add some debts first.</Link></p>
            </div>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <div>
              <div className="card" style={{marginBottom:'16px'}}>
                <div className="card-head">
                  <span className="card-title">Settings</span>
                </div>
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
                  <div className="card-head">
                    <span className="card-title">Payoff Summary</span>
                  </div>
                  <div className="card-body" style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                    <div className="metric-card">
                      <div className="metric-label">Months to Payoff</div>
                      <div className="metric-value green">{payoff.months}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Years to Payoff</div>
                      <div className="metric-value amber">{(payoff.months / 12).toFixed(1)}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Total Interest Paid</div>
                      <div className="metric-value red">${payoff.totalInterest.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-head">
                <span className="card-title">Payoff Order</span>
              </div>
              <div className="card-body">
                {sortedDebts.map((d, i) => (
                  <div key={d.id} className="row-item">
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <div style={{width:'22px',height:'22px',borderRadius:'50%',background: i === 0 ? 'var(--gdim)' : 'var(--s3)',border:`1px solid ${i === 0 ? 'var(--green)' : 'var(--b)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontFamily:'DM Mono,monospace',color: i === 0 ? 'var(--green)' : 'var(--t3)',flexShrink:0}}>
                        {i + 1}
                      </div>
                      <span>{d.name}</span>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div className="mono red">${Number(d.balance).toFixed(2)}</div>
                      <div style={{fontSize:'11px',fontFamily:'DM Mono,monospace',color:'var(--amber)'}}>{d.apr}% APR</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}