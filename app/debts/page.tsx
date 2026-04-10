'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function DebtsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [debts, setDebts] = useState<any[]>([])
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [minPayment, setMinPayment] = useState('')
  const [apr, setApr] = useState('')
  const [dueDate, setDueDate] = useState('')
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
    const bal = parseFloat(balance)
    await supabase.from('debts').insert({
      user_id: user.id,
      name,
      balance: bal,
      orig_balance: bal,
      min_payment: parseFloat(minPayment),
      apr: parseFloat(apr),
      due_date: dueDate,
      paid: false,
    })
    setName(''); setBalance(''); setMinPayment(''); setApr(''); setDueDate('')
    loadDebts()
  }

  async function deleteDebt(id: number) {
    await supabase.from('debts').delete().eq('id', id)
    loadDebts()
  }

  async function markPaid(id: number, currentBalance: number) {
    await supabase.from('debts').update({ paid: true, undo_balance: currentBalance, balance: 0 }).eq('id', id)
    loadDebts()
  }

  async function undoPaid(id: number, undoBalance: number) {
    await supabase.from('debts').update({ paid: false, balance: undoBalance }).eq('id', id)
    loadDebts()
  }

  function getDueBadge(dueDate: string, paid: boolean) {
    if (paid) return <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',padding:'2px 7px',borderRadius:'20px',background:'var(--gdim)',color:'var(--green)',border:'1px solid var(--green)'}}>PAID</span>
    if (!dueDate) return null
    const parts = dueDate.split('/')
    if (parts.length !== 3) return null
    const due = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]))
    const today = new Date()
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',padding:'2px 7px',borderRadius:'20px',background:'var(--rdim)',color:'var(--red)',border:'1px solid var(--red)'}}>OVERDUE</span>
    if (diff <= 7) return <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',padding:'2px 7px',borderRadius:'20px',background:'var(--adim)',color:'var(--amber)',border:'1px solid var(--amber)'}}>DUE SOON</span>
    return null
  }

  function getProgress(balance: number, origBalance: number) {
    if (!origBalance || origBalance <= 0) return 0
    const paid = Math.max(0, origBalance - balance)
    return Math.min(100, Math.round((paid / origBalance) * 100))
  }

  const activeDebts = debts.filter(d => !d.paid)
  const paidDebts = debts.filter(d => d.paid)
  const totalBalance = activeDebts.reduce((sum, d) => sum + Number(d.balance), 0)
  const totalMin = activeDebts.reduce((sum, d) => sum + Number(d.min_payment), 0)

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <div className="page-title">My Debts</div>
          <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'8px'}}>Track and manage all your debts</div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'14px',marginBottom:'16px'}}>
          <div className="metric-card">
            <div className="metric-label">Total Balance</div>
            <div className="metric-value red">${totalBalance.toFixed(2)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Min Payment</div>
            <div className="metric-value amber">${totalMin.toFixed(2)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Debts Paid Off</div>
            <div className="metric-value green">{paidDebts.length}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Add Debt</span>
          </div>
          <div className="card-body">
            <form onSubmit={addDebt} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto',gap:'10px',alignItems:'end'}}>
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
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Due Date</div>
                <input className="fi" type="text" placeholder="MM/DD/YYYY" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <button type="submit" className="btn-add">Add</button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Active Debts</span>
            <span style={{fontSize:'11px',fontFamily:'DM Mono,monospace',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'999px',padding:'3px 10px',color:'var(--t3)'}}>{activeDebts.length} total</span>
          </div>
          {loading ? (
            <div className="card-body"><p style={{color:'var(--t3)'}}>Loading...</p></div>
          ) : activeDebts.length === 0 ? (
            <div className="card-body"><p style={{color:'var(--t3)'}}>No active debts.</p></div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['Name','Balance','Min Payment','APR','Due Date','Progress',''].map(h => (
                    <th key={h} style={{padding:'10px 16px',fontSize:'10px',fontWeight:600,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.09em',fontFamily:'DM Mono,monospace',textAlign:'left',background:'var(--s2)',borderBottom:'1px solid var(--b)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeDebts.map((d, i) => {
                  const progress = getProgress(Number(d.balance), Number(d.orig_balance))
                  return (
                    <tr key={d.id} style={{background: i % 2 === 0 ? 'rgba(23,27,26,1)' : 'rgba(32,38,37,1)'}}>
                      <td style={{padding:'10px 16px',fontSize:'13px',borderBottom:'1px solid var(--b)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          {d.name}
                          {getDueBadge(d.due_date, d.paid)}
                        </div>
                      </td>
                      <td style={{padding:'10px 16px',fontSize:'13px',fontFamily:'DM Mono,monospace',color:'var(--red)',borderBottom:'1px solid var(--b)'}}>${Number(d.balance).toFixed(2)}</td>
                      <td style={{padding:'10px 16px',fontSize:'13px',fontFamily:'DM Mono,monospace',color:'var(--amber)',borderBottom:'1px solid var(--b)'}}>${Number(d.min_payment).toFixed(2)}</td>
                      <td style={{padding:'10px 16px',fontSize:'13px',fontFamily:'DM Mono,monospace',color:'var(--amber)',borderBottom:'1px solid var(--b)'}}>{d.apr}%</td>
                      <td style={{padding:'10px 16px',fontSize:'13px',fontFamily:'DM Mono,monospace',color:'var(--blue)',borderBottom:'1px solid var(--b)'}}>{d.due_date || '—'}</td>
                      <td style={{padding:'10px 16px',borderBottom:'1px solid var(--b)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
                          <div style={{flex:1,height:'6px',background:'var(--s3)',borderRadius:'999px',overflow:'hidden',maxWidth:'86px'}}>
                            <div style={{height:'100%',borderRadius:'999px',background: progress > 66 ? 'var(--green)' : progress > 33 ? 'var(--amber)' : 'var(--red)',width:`${progress}%`,transition:'width .3s'}} />
                          </div>
                          <span style={{fontSize:'11px',fontFamily:'DM Mono,monospace',color:'var(--t2)',whiteSpace:'nowrap'}}>{progress}%</span>
                        </div>
                      </td>
                      <td style={{padding:'10px 16px',borderBottom:'1px solid var(--b)'}}>
                        <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                          <button onClick={() => markPaid(d.id, Number(d.balance))} style={{fontSize:'11px',fontFamily:'DM Mono,monospace',padding:'6px 10px',borderRadius:'999px',cursor:'pointer',border:'1px solid var(--green)',background:'transparent',color:'var(--green)',whiteSpace:'nowrap',transition:'all .14s'}}>
                            ✓ Paid
                          </button>
                          <button onClick={() => deleteDebt(d.id)} className="btn-del">✕</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {paidDebts.length > 0 && (
          <div className="card">
            <div className="card-head">
              <span className="card-title">Paid Off</span>
              <span style={{fontSize:'11px',fontFamily:'DM Mono,monospace',background:'var(--gdim)',border:'1px solid var(--green)',borderRadius:'999px',padding:'3px 10px',color:'var(--green)'}}>{paidDebts.length} paid</span>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <tbody>
                {paidDebts.map((d, i) => (
                  <tr key={d.id} style={{background: i % 2 === 0 ? 'rgba(23,27,26,1)' : 'rgba(32,38,37,1)',opacity:0.6}}>
                    <td style={{padding:'10px 16px',fontSize:'13px',borderBottom:'1px solid var(--b)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        {d.name}
                        <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',padding:'2px 7px',borderRadius:'20px',background:'var(--gdim)',color:'var(--green)',border:'1px solid var(--green)'}}>PAID</span>
                      </div>
                    </td>
                    <td style={{padding:'10px 16px',fontSize:'13px',fontFamily:'DM Mono,monospace',color:'var(--green)',borderBottom:'1px solid var(--b)'}}>$0.00</td>
                    <td style={{padding:'10px 16px',borderBottom:'1px solid var(--b)'}}>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button onClick={() => undoPaid(d.id, Number(d.undo_balance))} style={{fontSize:'11px',fontFamily:'DM Mono,monospace',padding:'6px 10px',borderRadius:'999px',cursor:'pointer',border:'1px solid var(--b2)',background:'transparent',color:'var(--t3)',whiteSpace:'nowrap',transition:'all .14s'}}>
                          Undo
                        </button>
                        <button onClick={() => deleteDebt(d.id)} className="btn-del">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}