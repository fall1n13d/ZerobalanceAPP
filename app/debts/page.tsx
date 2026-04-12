'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import DateInput from '@/components/DateInput'

function EditableCell({ value, onChange, type = 'text', color, isDate = false }: {
  value: string, onChange: (v: string) => void, type?: string, color?: string, isDate?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  function handleBlur() {
    setEditing(false)
    onChange(val)
  }

  if (editing) {
    if (isDate) {
      return (
        <DateInput
          value={val}
          onChange={v => setVal(v)}
          className=""
          style={{background:'var(--s2)',border:'1px solid var(--green)',borderRadius:'9px',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:'13px',padding:'5px 8px',width:'130px',outline:'none',boxShadow:'0 0 0 2px var(--gdim)'}}
          onBlur={handleBlur}
        />
      )
    }
    return (
      <input
        autoFocus
        type={type}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => e.key === 'Enter' && handleBlur()}
        style={{background:'var(--s2)',border:'1px solid var(--green)',borderRadius:'9px',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:'13px',padding:'5px 8px',width:'100%',outline:'none',boxShadow:'0 0 0 2px var(--gdim)'}}
      />
    )
  }

  return (
    <span
      onClick={() => { setVal(value); setEditing(true) }}
      title="Click to edit"
      style={{cursor:'text',color: color || 'var(--text)',fontFamily:'DM Mono,monospace',fontSize:'13px',borderBottom:'1px dashed var(--b2)',paddingBottom:'1px'}}
    >
      {value || '—'}
    </span>
  )
}

function advanceDueDate(dueDate: string): string {
  if (!dueDate) return ''
  const parts = dueDate.split('/')
  if (parts.length !== 3) return dueDate
  let month = parseInt(parts[0])
  const day = parseInt(parts[1])
  let year = parseInt(parts[2])
  month += 1
  if (month > 12) { month = 1; year += 1 }
  return `${String(month).padStart(2,'0')}/${String(day).padStart(2,'0')}/${year}`
}

function parseDueDate(dueDate: string): Date | null {
  if (!dueDate) return null
  const parts = dueDate.split('/')
  if (parts.length !== 3) return null
  const d = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]))
  return isNaN(d.getTime()) ? null : d
}

function calcDueInfo(balance: number, apr: number, dueDate: string) {
  if (!dueDate) return null
  const due = parseDueDate(dueDate)
  if (!due) return null
  const today = new Date()
  today.setHours(0,0,0,0)
  due.setHours(0,0,0,0)
  const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const daysUsed = Math.max(0, days)
  const interest = Math.round(balance * (apr / 100 / 365) * daysUsed * 100) / 100
  const totalDue = Math.round((balance + interest) * 100) / 100
  return { days, interest, totalDue }
}

async function accrueOverdueInterest(debts: any[], supabase: any) {
  const today = new Date()
  today.setHours(0,0,0,0)
  for (const debt of debts) {
    if (debt.paid || !debt.due_date) continue
    const due = parseDueDate(debt.due_date)
    if (!due) continue
    due.setHours(0,0,0,0)
    if (today > due) {
      const daysOverdue = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
      const dailyRate = Number(debt.apr) / 100 / 365
      const interest = Math.round(Number(debt.balance) * dailyRate * daysOverdue * 100) / 100
      const newBalance = Math.round((Number(debt.balance) + interest) * 100) / 100
      await supabase.from('debts').update({ balance: newBalance }).eq('id', debt.id)
    }
  }
}

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
  const [accruing, setAccruing] = useState(false)

  useEffect(() => { loadDebts() }, [])

  async function loadDebts() {
    const { data } = await supabase.from('debts').select('*').order('created_at', { ascending: true })
    if (!data) { setLoading(false); return }
    const overdue = data.filter(d => {
      if (d.paid || !d.due_date) return false
      const due = parseDueDate(d.due_date)
      if (!due) return false
      const today = new Date()
      today.setHours(0,0,0,0)
      due.setHours(0,0,0,0)
      return today > due
    })
    if (overdue.length > 0) {
      setAccruing(true)
      await accrueOverdueInterest(overdue, supabase)
      setAccruing(false)
      const { data: refreshed } = await supabase.from('debts').select('*').order('created_at', { ascending: true })
      setDebts(refreshed || [])
    } else {
      setDebts(data)
    }
    setLoading(false)
  }

  async function addDebt(e: any) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    const bal = parseFloat(balance)
    await supabase.from('debts').insert({
      user_id: user.id, name, balance: bal, orig_balance: bal,
      min_payment: parseFloat(minPayment), apr: parseFloat(apr),
      due_date: dueDate, paid: false,
    })
    setName(''); setBalance(''); setMinPayment(''); setApr(''); setDueDate('')
    loadDebts()
  }

  async function updateDebt(id: number, field: string, value: string) {
    const numericFields = ['balance', 'min_payment', 'apr']
    const update: any = {}
    update[field] = numericFields.includes(field) ? parseFloat(value) || 0 : value
    await supabase.from('debts').update(update).eq('id', id)
    loadDebts()
  }

  async function makePayment(debt: any) {
    const currentBalance = Number(debt.balance)
    const apr = Number(debt.apr)
    const minPmt = Number(debt.min_payment)
    const currentDueDate = debt.due_date || ''
    const dueInfo = calcDueInfo(currentBalance, apr, currentDueDate)
    const balanceWithInterest = dueInfo ? dueInfo.totalDue : currentBalance
    const newBalance = Math.max(0, Math.round((balanceWithInterest - minPmt) * 100) / 100)
    const newDueDate = advanceDueDate(currentDueDate)
    const isPaidOff = newBalance === 0
    const { error } = await supabase.from('debts').update({
      balance: newBalance, due_date: newDueDate, paid: isPaidOff,
      undo_balance: currentBalance, undo_due_date: currentDueDate,
    }).eq('id', debt.id)
    if (error) { alert('Payment failed: ' + error.message); return }
    loadDebts()
  }

  async function undoPayment(debt: any) {
    if (debt.undo_balance == null) { alert('No previous payment to undo.'); return }
    const { error } = await supabase.from('debts').update({
      balance: Number(debt.undo_balance),
      due_date: debt.undo_due_date || debt.due_date,
      paid: false, undo_balance: null, undo_due_date: null,
    }).eq('id', debt.id)
    if (error) { alert('Undo failed: ' + error.message); return }
    loadDebts()
  }

  async function deleteDebt(id: number) {
    await supabase.from('debts').delete().eq('id', id)
    loadDebts()
  }

  function getDueBadge(dueDate: string, paid: boolean) {
    if (paid) return <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',padding:'2px 7px',borderRadius:'20px',background:'var(--gdim)',color:'var(--green)',border:'1px solid var(--green)'}}>PAID OFF</span>
    if (!dueDate) return null
    const due = parseDueDate(dueDate)
    if (!due) return null
    const today = new Date()
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',padding:'2px 7px',borderRadius:'20px',background:'var(--rdim)',color:'var(--red)',border:'1px solid var(--red)'}}>OVERDUE</span>
    if (diff <= 7) return <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',padding:'2px 7px',borderRadius:'20px',background:'var(--adim)',color:'var(--amber)',border:'1px solid var(--amber)'}}>DUE SOON</span>
    return null
  }

  function getProgress(balance: number, origBalance: number) {
    if (!origBalance || origBalance <= 0) return 0
    return Math.min(100, Math.round((Math.max(0, origBalance - balance) / origBalance) * 100))
  }

  const activeDebts = debts.filter(d => !d.paid)
  const paidDebts = debts.filter(d => d.paid)
  const totalBalance = activeDebts.reduce((sum, d) => sum + Number(d.balance), 0)
  const totalMin = activeDebts.reduce((sum, d) => sum + Number(d.min_payment), 0)

  const thStyle: React.CSSProperties = {
    padding:'10px 16px', fontSize:'10px', fontWeight:600, color:'var(--t3)',
    textTransform:'uppercase', letterSpacing:'.09em', fontFamily:'DM Mono,monospace',
    textAlign:'left', background:'var(--s2)', borderBottom:'1px solid var(--b)',
  }

  const tdStyle = (i: number): React.CSSProperties => ({
    padding:'12px 16px', fontSize:'13px', borderBottom:'1px solid var(--b)',
    background: i % 2 === 0 ? 'var(--s2)' : 'transparent',
  })

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="page-title">My Debts</div>
            {accruing && (
              <span style={{fontSize:'11px',fontFamily:'DM Mono,monospace',color:'var(--amber)',background:'var(--adim)',border:'1px solid var(--amber)',borderRadius:'999px',padding:'4px 12px'}}>
                ⏳ Accruing interest...
              </span>
            )}
          </div>
          <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'8px'}}>
            Click any value to edit · ✓ Pay adds interest and advances due date · Change due date to past to mark overdue
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'14px',marginBottom:'16px'}}>
          <div className="metric-card" style={{borderTop:'2px solid var(--red)'}}>
            <div className="metric-label">Total Balance</div>
            <div className="metric-value red">${totalBalance.toFixed(2)}</div>
          </div>
          <div className="metric-card" style={{borderTop:'2px solid var(--amber)'}}>
            <div className="metric-label">Total Min Payment</div>
            <div className="metric-value amber">${totalMin.toFixed(2)}</div>
          </div>
          <div className="metric-card" style={{borderTop:'2px solid var(--green)'}}>
            <div className="metric-label">Debts Paid Off</div>
            <div className="metric-value green">{paidDebts.length}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><span className="card-title">Add Debt</span></div>
          <div className="card-body">
            <form onSubmit={addDebt} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto',gap:'10px',alignItems:'end'}}>
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Name</div>
                <input className="fi" type="text" placeholder="Credit Card" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Balance</div>
                <input className="fi" type="number" placeholder="0.00" value={balance} onChange={e => setBalance(e.target.value)} required />
              </div>
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Min Payment</div>
                <input className="fi" type="number" placeholder="0.00" value={minPayment} onChange={e => setMinPayment(e.target.value)} required />
              </div>
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>APR %</div>
                <input className="fi" type="number" placeholder="0.00" value={apr} onChange={e => setApr(e.target.value)} required />
              </div>
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Due Date</div>
                <DateInput value={dueDate} onChange={setDueDate} />
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
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:'900px'}}>
                <thead>
                  <tr>
                    {['Name','Balance','Min Payment','APR %','Due Date','Interest Due','Total Due','Progress',''].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeDebts.map((d, i) => {
                    const progress = getProgress(Number(d.balance), Number(d.orig_balance))
                    const dueInfo = calcDueInfo(Number(d.balance), Number(d.apr), d.due_date)
                    const isOverdue = dueInfo && dueInfo.days < 0
                    return (
                      <tr key={d.id} style={{background: isOverdue ? 'rgba(255,91,91,0.04)' : 'transparent'}}>
                        <td style={{...tdStyle(i),background:'transparent'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                            <EditableCell value={d.name} onChange={v => updateDebt(d.id, 'name', v)} />
                            {getDueBadge(d.due_date, d.paid)}
                          </div>
                        </td>
                        <td style={{...tdStyle(i),background:'transparent'}}>
                          <EditableCell value={Number(d.balance).toFixed(2)} onChange={v => updateDebt(d.id, 'balance', v)} type="number" color="var(--red)" />
                        </td>
                        <td style={{...tdStyle(i),background:'transparent'}}>
                          <EditableCell value={Number(d.min_payment).toFixed(2)} onChange={v => updateDebt(d.id, 'min_payment', v)} type="number" color="var(--amber)" />
                        </td>
                        <td style={{...tdStyle(i),background:'transparent'}}>
                          <EditableCell value={String(d.apr)} onChange={v => updateDebt(d.id, 'apr', v)} type="number" color="var(--amber)" />
                        </td>
                        <td style={{...tdStyle(i),background:'transparent'}}>
                          <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                            <EditableCell value={d.due_date || ''} onChange={v => updateDebt(d.id, 'due_date', v)} color={isOverdue ? 'var(--red)' : 'var(--blue)'} isDate={true} />
                            {dueInfo && (
                              <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color: dueInfo.days < 0 ? 'var(--red)' : dueInfo.days <= 7 ? 'var(--amber)' : 'var(--t3)'}}>
                                {dueInfo.days < 0 ? `${Math.abs(dueInfo.days)}d overdue` : dueInfo.days === 0 ? 'due today' : `${dueInfo.days}d left`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{...tdStyle(i),background:'transparent'}}>
                          {dueInfo ? <span style={{fontFamily:'DM Mono,monospace',fontSize:'13px',color:'var(--amber)'}}>+${dueInfo.interest.toFixed(2)}</span> : <span style={{color:'var(--t3)'}}>—</span>}
                        </td>
                        <td style={{...tdStyle(i),background:'transparent'}}>
                          {dueInfo ? <span style={{fontFamily:'DM Mono,monospace',fontSize:'13px',color:'var(--red)',fontWeight:600}}>${dueInfo.totalDue.toFixed(2)}</span> : <span style={{color:'var(--t3)'}}>—</span>}
                        </td>
                        <td style={{...tdStyle(i),background:'transparent'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
                            <div style={{flex:1,height:'6px',background:'var(--s3)',borderRadius:'999px',overflow:'hidden',maxWidth:'70px'}}>
                              <div style={{height:'100%',borderRadius:'999px',background: progress > 66 ? 'var(--green)' : progress > 33 ? 'var(--amber)' : 'var(--red)',width:`${progress}%`,transition:'width .3s'}} />
                            </div>
                            <span style={{fontSize:'11px',fontFamily:'DM Mono,monospace',color:'var(--t2)',whiteSpace:'nowrap'}}>{progress}%</span>
                          </div>
                        </td>
                        <td style={{...tdStyle(i),background:'transparent'}}>
                          <div style={{display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap'}}>
                            <button
                              onClick={() => makePayment(d)}
                              style={{fontSize:'11px',fontFamily:'DM Mono,monospace',padding:'6px 10px',borderRadius:'999px',cursor:'pointer',border:'1px solid var(--green)',background:'transparent',color:'var(--green)',whiteSpace:'nowrap',transition:'all .14s'}}
                            >
                              ✓ Pay
                            </button>
                            {d.undo_balance != null && (
                              <button
                                onClick={() => undoPayment(d)}
                                style={{fontSize:'11px',fontFamily:'DM Mono,monospace',padding:'6px 10px',borderRadius:'999px',cursor:'pointer',border:'1px solid var(--amber)',background:'transparent',color:'var(--amber)',whiteSpace:'nowrap',transition:'all .14s'}}
                              >
                                Undo
                              </button>
                            )}
                            <button onClick={() => deleteDebt(d.id)} className="btn-del">✕</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {paidDebts.length > 0 && (
          <div className="card">
            <div className="card-head">
              <span className="card-title">🎉 Paid Off</span>
              <span style={{fontSize:'11px',fontFamily:'DM Mono,monospace',background:'var(--gdim)',border:'1px solid var(--green)',borderRadius:'999px',padding:'3px 10px',color:'var(--green)'}}>{paidDebts.length} paid</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <tbody>
                  {paidDebts.map((d, i) => (
                    <tr key={d.id} style={{opacity:0.6}}>
                      <td style={tdStyle(i)}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          {d.name}
                          <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',padding:'2px 7px',borderRadius:'20px',background:'var(--gdim)',color:'var(--green)',border:'1px solid var(--green)'}}>PAID OFF</span>
                        </div>
                      </td>
                      <td style={{...tdStyle(i),fontFamily:'DM Mono,monospace',color:'var(--green)'}}>$0.00</td>
                      <td style={tdStyle(i)}>
                        <div style={{display:'flex',gap:'6px'}}>
                          <button onClick={() => undoPayment(d)} style={{fontSize:'11px',fontFamily:'DM Mono,monospace',padding:'6px 10px',borderRadius:'999px',cursor:'pointer',border:'1px solid var(--amber)',background:'transparent',color:'var(--amber)',whiteSpace:'nowrap',transition:'all .14s'}}>
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
          </div>
        )}
      </main>
    </div>
  )
}