'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function BudgetPage() {
  const supabase = createClient()
  const router = useRouter()
  const [income, setIncome] = useState<any[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [incomeName, setIncomeName] = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [billName, setBillName] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: incomeData } = await supabase.from('income').select('*').order('created_at', { ascending: true })
    const { data: billsData } = await supabase.from('bills').select('*').order('created_at', { ascending: true })
    setIncome(incomeData || [])
    setBills(billsData || [])
    setLoading(false)
  }

  async function addIncome(e: any) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    await supabase.from('income').insert({ user_id: user.id, name: incomeName, amount: parseFloat(incomeAmount) })
    setIncomeName(''); setIncomeAmount('')
    loadData()
  }

  async function addBill(e: any) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    await supabase.from('bills').insert({ user_id: user.id, name: billName, amount: parseFloat(billAmount) })
    setBillName(''); setBillAmount('')
    loadData()
  }

  async function deleteIncome(id: number) {
    await supabase.from('income').delete().eq('id', id)
    loadData()
  }

  async function deleteBill(id: number) {
    await supabase.from('bills').delete().eq('id', id)
    loadData()
  }

  const totalIncome = income.reduce((sum, i) => sum + Number(i.amount), 0)
  const totalBills = bills.reduce((sum, b) => sum + Number(b.amount), 0)
  const leftover = totalIncome - totalBills

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-name">Zero Balance</div>
          <div className="logo-sub">Debt Freedom System</div>
        </div>
        <nav className="nav-links">
          <Link href="/debts" className="nav-item">💳 My Debts</Link>
          <Link href="/budget" className="nav-item active">💰 Budget</Link>
          <Link href="/records" className="nav-item">📋 Records</Link>
          <Link href="/snowball" className="nav-item">❄️ Snowball</Link>
        </nav>
        <div className="nav-logout">
          <Link href="/login" className="btn-logout" style={{display:'block',textAlign:'center',textDecoration:'none'}}>Sign Out</Link>
        </div>
      </aside>
      <main className="main">
        <div className="page-header">
          <div className="page-title">Budget</div>
          <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'8px'}}>Track your income and bills</div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'14px',marginBottom:'16px'}}>
          <div className="metric-card">
            <div className="metric-label">Total Income</div>
            <div className="metric-value green">${totalIncome.toFixed(2)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Bills</div>
            <div className="metric-value amber">${totalBills.toFixed(2)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Leftover</div>
            <div className="metric-value" style={{color: leftover >= 0 ? 'var(--blue)' : 'var(--red)'}}>${leftover.toFixed(2)}</div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
          <div className="card">
            <div className="card-head">
              <span className="card-title">Income</span>
            </div>
            <div className="card-body">
              <form onSubmit={addIncome} style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
                <input className="fi" type="text" placeholder="Name" value={incomeName} onChange={(e) => setIncomeName(e.target.value)} required />
                <input className="fi" type="number" placeholder="Amount" value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} required style={{width:'120px'}} />
                <button type="submit" className="btn-add">Add</button>
              </form>
              {loading ? <p style={{color:'var(--t3)'}}>Loading...</p> : income.map((i) => (
                <div key={i.id} className="row-item">
                  <span>{i.name}</span>
                  <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
                    <span className="mono green">${Number(i.amount).toFixed(2)}</span>
                    <button onClick={() => deleteIncome(i.id)} className="btn-del">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="card-title">Bills</span>
            </div>
            <div className="card-body">
              <form onSubmit={addBill} style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
                <input className="fi" type="text" placeholder="Name" value={billName} onChange={(e) => setBillName(e.target.value)} required />
                <input className="fi" type="number" placeholder="Amount" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} required style={{width:'120px'}} />
                <button type="submit" className="btn-add">Add</button>
              </form>
              {loading ? <p style={{color:'var(--t3)'}}>Loading...</p> : bills.map((b) => (
                <div key={b.id} className="row-item">
                  <span>{b.name}</span>
                  <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
                    <span className="mono amber">${Number(b.amount).toFixed(2)}</span>
                    <button onClick={() => deleteBill(b.id)} className="btn-del">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}