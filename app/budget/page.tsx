'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

function DateInput({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 8) v = v.slice(0, 8)
    if (v.length >= 5) v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4)
    else if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2)
    onChange(v)
  }
  return <input className="fi" type="text" placeholder="MM/DD/YYYY" value={value} onChange={handleChange} maxLength={10} />
}

const CAT_LABELS: Record<string, string> = {
  housing:'🏠 Housing', utilities:'💡 Utilities', food:'🛒 Food',
  transport:'🚗 Transport', insurance:'🛡 Insurance', subscriptions:'📱 Subscriptions',
  health:'❤️ Health', other:'📦 Other'
}

const FREQ_LABELS: Record<string, string> = {
  weekly:'Weekly', biweekly:'Bi-weekly', twicemonthly:'Twice/month', monthly:'Monthly'
}

export default function BudgetPage() {
  const supabase = createClient()
  const router = useRouter()

  const [earners, setEarners] = useState<any[]>([])
  const [paychecks, setPaychecks] = useState<any[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [extraIncome, setExtraIncome] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{msg: string, item: any, table: string} | null>(null)
  const toastTimer = useRef<any>(null)

  const [earnerName, setEarnerName] = useState('')
  const [earnerFreq, setEarnerFreq] = useState('monthly')
  const [pcEarnerId, setPcEarnerId] = useState('')
  const [pcAmount, setPcAmount] = useState('')
  const [pcDate, setPcDate] = useState('')
  const [billName, setBillName] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [billCat, setBillCat] = useState('other')
  const [eiDesc, setEiDesc] = useState('')
  const [eiAmount, setEiAmount] = useState('')
  const [eiCat, setEiCat] = useState('other')
  const [eiDate, setEiDate] = useState('')
  const [exDesc, setExDesc] = useState('')
  const [exAmount, setExAmount] = useState('')
  const [exCat, setExCat] = useState('other')
  const [exDate, setExDate] = useState('')
  const [exNote, setExNote] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [e, p, b, ei, ex] = await Promise.all([
      supabase.from('earners').select('*').order('created_at'),
      supabase.from('paychecks').select('*').order('date', { ascending: false }),
      supabase.from('bills').select('*').order('created_at'),
      supabase.from('extra_income').select('*').order('date', { ascending: false }),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
    ])
    setEarners(e.data || [])
    setPaychecks(p.data || [])
    setBills(b.data || [])
    setExtraIncome(ei.data || [])
    setExpenses(ex.data || [])
    setLoading(false)
  }

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return null }
    return user
  }

  function showToast(msg: string, item: any, table: string) {
    setToast({ msg, item, table })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }

  async function softDelete(table: string, item: any, label: string) {
    await supabase.from(table).delete().eq('id', item.id)
    loadData()
    showToast(`${label} deleted`, item, table)
  }

  async function undoDelete(table: string, item: any) {
    const { id, ...rest } = item
    await supabase.from(table).insert(rest)
    setToast(null)
    loadData()
  }

  async function addEarner(e: any) {
    e.preventDefault()
    const user = await getUser(); if (!user) return
    await supabase.from('earners').insert({ user_id: user.id, name: earnerName, freq: earnerFreq })
    setEarnerName(''); loadData()
  }

  async function addPaycheck(e: any) {
    e.preventDefault()
    const user = await getUser(); if (!user) return
    await supabase.from('paychecks').insert({ user_id: user.id, earner_id: parseInt(pcEarnerId), amount: parseFloat(pcAmount), date: pcDate })
    setPcAmount(''); setPcDate(''); loadData()
  }

  async function addBill(e: any) {
    e.preventDefault()
    const user = await getUser(); if (!user) return
    await supabase.from('bills').insert({ user_id: user.id, name: billName, amount: parseFloat(billAmount), category: billCat })
    setBillName(''); setBillAmount(''); loadData()
  }

  async function addExtraIncome(e: any) {
    e.preventDefault()
    const user = await getUser(); if (!user) return
    await supabase.from('extra_income').insert({ user_id: user.id, description: eiDesc, amount: parseFloat(eiAmount), category: eiCat, date: eiDate })
    setEiDesc(''); setEiAmount(''); setEiDate(''); loadData()
  }

  async function addExpense(e: any) {
    e.preventDefault()
    const user = await getUser(); if (!user) return
    await supabase.from('expenses').insert({ user_id: user.id, description: exDesc, amount: parseFloat(exAmount), category: exCat, date: exDate, note: exNote })
    setExDesc(''); setExAmount(''); setExDate(''); setExNote(''); loadData()
  }

  const now = new Date()
  const thisMonth = (items: any[]) => items.filter(i => {
    const parts = i.date?.split('/')
    if (!parts || parts.length !== 3) return false
    return parseInt(parts[2]) === now.getFullYear() && parseInt(parts[0]) - 1 === now.getMonth()
  })

  const thisMonthPaychecks = thisMonth(paychecks)
  const thisMonthExtra = thisMonth(extraIncome)
  const thisMonthExpenses = thisMonth(expenses)
  const totalIncome = thisMonthPaychecks.reduce((s, p) => s + Number(p.amount), 0) + thisMonthExtra.reduce((s, e) => s + Number(e.amount), 0)
  const totalBills = bills.reduce((s, b) => s + Number(b.amount), 0)
  const totalExpenses = thisMonthExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const leftover = totalIncome - totalBills - totalExpenses

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

  async function archiveMonth() {
    const user = await getUser(); if (!user) return
    const monthLabel = monthNames[now.getMonth()] + ' ' + now.getFullYear()
    await supabase.from('records').insert({
      user_id: user.id,
      month: monthLabel,
      total_debt: 0,
      total_paid: 0,
      notes: `Income: $${totalIncome.toFixed(2)} · Bills: $${totalBills.toFixed(2)} · Expenses: $${totalExpenses.toFixed(2)} · Leftover: $${leftover.toFixed(2)}`,
    })
    alert(monthLabel + ' archived to Records!')
  }

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">

        {/* Undo Toast */}
        {toast && (
          <div style={{position:'fixed',bottom:'24px',right:'24px',background:'var(--surface)',border:'1px solid var(--b2)',borderRadius:'999px',padding:'10px 16px',fontSize:'12px',fontFamily:'DM Mono,monospace',color:'var(--t2)',zIndex:600,display:'flex',alignItems:'center',gap:'12px',boxShadow:'var(--shadow)'}}>
            <span>{toast.msg}</span>
            <button onClick={() => undoDelete(toast.table, toast.item)} style={{background:'var(--gdim)',border:'1px solid var(--green)',borderRadius:'999px',color:'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'11px',padding:'4px 10px',cursor:'pointer'}}>
              Undo
            </button>
            <button onClick={() => setToast(null)} style={{background:'none',border:'none',color:'var(--t3)',cursor:'pointer',fontSize:'14px'}}>✕</button>
          </div>
        )}

        <div className="page-header">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="page-title">Budget</div>
            <button onClick={archiveMonth} className="btn-add" style={{fontSize:'12px',padding:'8px 16px'}}>
              📦 Archive This Month
            </button>
          </div>
          <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'8px'}}>Track your income, bills and expenses</div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'16px'}}>
          <div className="metric-card">
            <div className="metric-label">This Month Income</div>
            <div className="metric-value green">${totalIncome.toFixed(2)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Monthly Bills</div>
            <div className="metric-value amber">${totalBills.toFixed(2)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">This Month Expenses</div>
            <div className="metric-value" style={{color:'var(--purple)'}}>${totalExpenses.toFixed(2)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Leftover</div>
            <div className="metric-value" style={{color: leftover >= 0 ? 'var(--blue)' : 'var(--red)'}}>${leftover.toFixed(2)}</div>
          </div>
        </div>

        {loading ? <p style={{color:'var(--t3)'}}>Loading...</p> : (
          <>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
              <div className="card">
                <div className="card-head"><span className="card-title">👤 Earners</span></div>
                <div className="card-body">
                  <form onSubmit={addEarner} style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
                    <input className="fi" type="text" placeholder="Name" value={earnerName} onChange={e => setEarnerName(e.target.value)} required />
                    <select className="fi" value={earnerFreq} onChange={e => setEarnerFreq(e.target.value)} style={{width:'140px'}}>
                      {Object.entries(FREQ_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <button type="submit" className="btn-add">Add</button>
                  </form>
                  {earners.length === 0 ? <p style={{color:'var(--t3)',fontSize:'13px'}}>No earners yet.</p> : earners.map(e => (
                    <div key={e.id} className="row-item">
                      <div>
                        <div>{e.name}</div>
                        <div style={{fontSize:'11px',color:'var(--t3)',fontFamily:'DM Mono,monospace'}}>{FREQ_LABELS[e.freq]}</div>
                      </div>
                      <button onClick={() => softDelete('earners', e, e.name)} className="btn-del">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-head"><span className="card-title">💵 Log Paycheck</span></div>
                <div className="card-body">
                  <form onSubmit={addPaycheck} style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'16px'}}>
                    <select className="fi" value={pcEarnerId} onChange={e => setPcEarnerId(e.target.value)} required>
                      <option value="">Select earner</option>
                      {earners.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <div style={{display:'flex',gap:'8px'}}>
                      <input className="fi" type="number" placeholder="Amount" value={pcAmount} onChange={e => setPcAmount(e.target.value)} required />
                      <DateInput value={pcDate} onChange={setPcDate} />
                    </div>
                    <button type="submit" className="btn-add">Log Paycheck</button>
                  </form>
                  {thisMonthPaychecks.length === 0 ? <p style={{color:'var(--t3)',fontSize:'13px'}}>No paychecks this month.</p> : thisMonthPaychecks.map(p => {
                    const earner = earners.find(e => e.id === p.earner_id)
                    return (
                      <div key={p.id} className="row-item">
                        <div>
                          <div style={{fontSize:'12px',color:'var(--t2)'}}>{earner?.name || 'Unknown'}</div>
                          <div style={{fontSize:'11px',color:'var(--t3)',fontFamily:'DM Mono,monospace'}}>{p.date}</div>
                        </div>
                        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                          <span className="mono green">${Number(p.amount).toFixed(2)}</span>
                          <button onClick={() => softDelete('paychecks', p, 'Paycheck')} className="btn-del">✕</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
              <div className="card">
                <div className="card-head">
                  <span className="card-title">📋 Monthly Bills</span>
                  <span className="mono amber" style={{fontSize:'13px'}}>${totalBills.toFixed(2)}</span>
                </div>
                <div className="card-body">
                  <form onSubmit={addBill} style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
                    <input className="fi" type="text" placeholder="Bill name" value={billName} onChange={e => setBillName(e.target.value)} required style={{flex:2,minWidth:'120px'}} />
                    <input className="fi" type="number" placeholder="Amount" value={billAmount} onChange={e => setBillAmount(e.target.value)} required style={{width:'110px'}} />
                    <select className="fi" value={billCat} onChange={e => setBillCat(e.target.value)} style={{width:'150px'}}>
                      {Object.entries(CAT_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <button type="submit" className="btn-add">Add</button>
                  </form>
                  {bills.length === 0 ? <p style={{color:'var(--t3)',fontSize:'13px'}}>No bills yet.</p> : bills.map(b => (
                    <div key={b.id} className="row-item">
                      <div>
                        <div>{b.name}</div>
                        <div style={{fontSize:'11px',color:'var(--t3)'}}>{CAT_LABELS[b.category]}</div>
                      </div>
                      <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                        <span className="mono amber">${Number(b.amount).toFixed(2)}</span>
                        <button onClick={() => softDelete('bills', b, b.name)} className="btn-del">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-head"><span className="card-title">➕ Extra Income</span></div>
                <div className="card-body">
                  <form onSubmit={addExtraIncome} style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
                    <input className="fi" type="text" placeholder="Description" value={eiDesc} onChange={e => setEiDesc(e.target.value)} required style={{flex:2,minWidth:'120px'}} />
                    <input className="fi" type="number" placeholder="Amount" value={eiAmount} onChange={e => setEiAmount(e.target.value)} required style={{width:'110px'}} />
                    <select className="fi" value={eiCat} onChange={e => setEiCat(e.target.value)} style={{width:'150px'}}>
                      {Object.entries(CAT_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <DateInput value={eiDate} onChange={setEiDate} />
                    <button type="submit" className="btn-add">Add</button>
                  </form>
                  {thisMonthExtra.length === 0 ? <p style={{color:'var(--t3)',fontSize:'13px'}}>No extra income this month.</p> : thisMonthExtra.map(e => (
                    <div key={e.id} className="row-item">
                      <div>
                        <div>{e.description}</div>
                        <div style={{fontSize:'11px',color:'var(--t3)'}}>{CAT_LABELS[e.category]} · {e.date}</div>
                      </div>
                      <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                        <span className="mono green">${Number(e.amount).toFixed(2)}</span>
                        <button onClick={() => softDelete('extra_income', e, e.description)} className="btn-del">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <span className="card-title">🧾 Expenses This Month</span>
                <span className="mono" style={{fontSize:'13px',color:'var(--purple)'}}>${totalExpenses.toFixed(2)}</span>
              </div>
              <div className="card-body">
                <form onSubmit={addExpense} style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
                  <input className="fi" type="text" placeholder="Description" value={exDesc} onChange={e => setExDesc(e.target.value)} required style={{flex:2,minWidth:'150px'}} />
                  <input className="fi" type="number" placeholder="Amount" value={exAmount} onChange={e => setExAmount(e.target.value)} required style={{width:'110px'}} />
                  <select className="fi" value={exCat} onChange={e => setExCat(e.target.value)} style={{width:'150px'}}>
                    {Object.entries(CAT_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <DateInput value={exDate} onChange={setExDate} />
                  <input className="fi" type="text" placeholder="Note (optional)" value={exNote} onChange={e => setExNote(e.target.value)} style={{flex:1,minWidth:'120px'}} />
                  <button type="submit" className="btn-add">Add</button>
                </form>
                {thisMonthExpenses.length === 0 ? <p style={{color:'var(--t3)',fontSize:'13px'}}>No expenses this month.</p> : thisMonthExpenses.map(e => (
                  <div key={e.id} className="row-item">
                    <div>
                      <div>{e.description}</div>
                      <div style={{fontSize:'11px',color:'var(--t3)'}}>{CAT_LABELS[e.category]} · {e.date}{e.note ? ` · ${e.note}` : ''}</div>
                    </div>
                    <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                      <span className="mono" style={{color:'var(--purple)'}}>${Number(e.amount).toFixed(2)}</span>
                      <button onClick={() => softDelete('expenses', e, e.description)} className="btn-del">✕</button>
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