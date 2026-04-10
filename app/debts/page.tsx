'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DebtsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [debts, setDebts] = useState<any[]>([])
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [minPayment, setMinPayment] = useState('')
  const [apr, setApr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDebts() }, [])

  async function loadDebts() {
    const { data } = await supabase.from('debts').select('*').order('created_at', { ascending: true })
    setDebts(data || [])
    setLoading(false)
  }

  async function addDebt(e: any) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    await supabase.from('debts').insert({
      user_id: user.id,
      name,
      balance: parseFloat(balance),
      min_payment: parseFloat(minPayment),
      apr: parseFloat(apr),
    })
    setName(''); setBalance(''); setMinPayment(''); setApr('')
    loadDebts()
  }

  async function deleteDebt(id: number) {
    await supabase.from('debts').delete().eq('id', id)
    loadDebts()
  }

  const totalBalance = debts.reduce((sum, d) => sum + Number(d.balance), 0)
  const totalMin = debts.reduce((sum, d) => sum + Number(d.min_payment), 0)

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-name">Zero Balance</div>
          <div className="logo-sub">Debt Freedom System</div>
        </div>
        <nav className="nav-links">
          <Link href="/debts" className="nav-item active">💳 My Debts</Link>
          <Link href="/budget" className="nav-item">💰 Budget</Link>
          <Link href="/records" className="nav-item">📋 Records</Link>
          <Link href="/snowball" className="nav-item">❄️ Snowball</Link>
        </nav>
        <div className="nav-logout">
          <Link href="/login" className="btn-logout" style={{display:'block',textAlign:'center',textDecoration:'none'}}>Sign Out</Link>
        </div>
      </aside>
      <main className="main">
        <div className="page-header">
          <div className="page-title">My Debts</div>
          <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'8px'}}>Track and manage all your debts</div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'14px',marginBottom:'16px'}}>
          <div className="metric-card">
            <div className="metric-label">Total Balance</div>
            <div className="metric-value red">${totalBalance.toFixed(2)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Min Payment</div>
            <div className="metric-value amber">${totalMin.toFixed(2)}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Add Debt</span>
          </div>
          <div className="card-body">
            <form onSubmit={addDebt} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',gap:'10px',alignItems:'end'}}>
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Name</div>
                <input className="fi" type="text" placeholder="Credit Card" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Balance</div>
                <input className="fi" type="number" placeholder="0.00" value={balance} onChange={(e) => setBalance(e.target.value)} required />
              </div>
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Min Payment</div>
                <input className="fi" type="number" placeholder="0.00" value={minPayment} onChange={(e) => setMinPayment(e.target.value)} required />
              </div>
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>APR %</div>
                <input className="fi" type="number" placeholder="0.00" value={apr} onChange={(e) => setApr(e.target.value)} required />
              </div>
              <button type="submit" className="btn-add">Add</button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Debts</span>
            <span style={{fontSize:'11px',fontFamily:'DM Mono,monospace',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'999px',padding:'3px 10px',color:'var(--t3)'}}>{debts.length} total</span>
          </div>
          {loading ? (
            <div className="card-body"><p style={{color:'var(--t3)'}}>Loading...</p></div>
          ) : debts.length === 0 ? (
            <div className="card-body"><p style={{color:'var(--t3)'}}>No debts added yet.</p></div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['Name','Balance','Min Payment','APR',''].map(h => (
                    <th key={h} style={{padding:'10px 16px',fontSize:'10px',fontWeight:600,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.09em',fontFamily:'DM Mono,monospace',textAlign:'left',background:'var(--s2)',borderBottom:'1px solid var(--b)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {debts.map((d, i) => (
                  <tr key={d.id} style={{background: i % 2 === 0 ? 'var(--s2)' : 'transparent'}}>
                    <td style={{padding:'10px 16px',fontSize:'13px',borderBottom:'1px solid var(--b)'}}>{d.name}</td>
                    <td style={{padding:'10px 16px',fontSize:'13px',fontFamily:'DM Mono,monospace',color:'var(--red)',borderBottom:'1px solid var(--b)'}}>${Number(d.balance).toFixed(2)}</td>
                    <td style={{padding:'10px 16px',fontSize:'13px',fontFamily:'DM Mono,monospace',color:'var(--amber)',borderBottom:'1px solid var(--b)'}}>${Number(d.min_payment).toFixed(2)}</td>
                    <td style={{padding:'10px 16px',fontSize:'13px',fontFamily:'DM Mono,monospace',color:'var(--amber)',borderBottom:'1px solid var(--b)'}}>{d.apr}%</td>
                    <td style={{padding:'10px 16px',borderBottom:'1px solid var(--b)'}}>
                      <button onClick={() => deleteDebt(d.id)} className="btn-del">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}