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

  function handleBlur() { setEditing(false); onChange(val) }

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
      style={{cursor:'text',color: color || 'var(--text)',fontFamily:'DM Mono,monospace',fontSize:'13px',borderBottom:'1px dashed rgba(255,255,255,0.12)',paddingBottom:'1px'}}
    >
      {value || '—'}
    </span>
  )
}

function advanceDueDate(d: string): string {
  if (!d) return ''
  const p = d.split('/')
  if (p.length !== 3) return d
  let m = parseInt(p[0]), day = parseInt(p[1]), y = parseInt(p[2])
  m += 1; if (m > 12) { m = 1; y += 1 }
  return `${String(m).padStart(2,'0')}/${String(day).padStart(2,'0')}/${y}`
}

function parseDueDate(d: string): Date | null {
  if (!d) return null
  const p = d.split('/')
  if (p.length !== 3) return null
  const dt = new Date(parseInt(p[2]), parseInt(p[0]) - 1, parseInt(p[1]))
  return isNaN(dt.getTime()) ? null : dt
}

function todayStr(): string {
  const n = new Date()
  return `${String(n.getMonth()+1).padStart(2,'0')}/${String(n.getDate()).padStart(2,'0')}/${n.getFullYear()}`
}

function calcDueInfo(balance: number, apr: number, dueDate: string) {
  if (!dueDate) return null
  const due = parseDueDate(dueDate)
  if (!due) return null
  const today = new Date(); today.setHours(0,0,0,0); due.setHours(0,0,0,0)
  const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const daysUsed = Math.max(0, days)
  const interest = Math.round(balance * (apr / 100 / 365) * daysUsed * 100) / 100
  return { days, interest, totalDue: Math.round((balance + interest) * 100) / 100 }
}

function getEffectiveApr(debt: any): number {
  if (debt.promo_apr != null && debt.promo_end_date) {
    const end = parseDueDate(debt.promo_end_date)
    if (end && new Date() <= end) return Number(debt.promo_apr)
  }
  return Number(debt.apr)
}

async function accrueOverdueInterest(debts: any[], supabase: any) {
  const today = new Date(); today.setHours(0,0,0,0)
  const ts = todayStr()
  for (const debt of debts) {
    if (debt.paid || !debt.due_date || debt.last_accrued === ts) continue
    const due = parseDueDate(debt.due_date)
    if (!due) continue; due.setHours(0,0,0,0)
    if (today > due) {
      const daysOverdue = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
      const apr = getEffectiveApr(debt)
      const interest = Math.round(Number(debt.balance) * (apr / 100 / 365) * daysOverdue * 100) / 100
      await supabase.from('debts').update({
        balance: Math.round((Number(debt.balance) + interest) * 100) / 100,
        last_accrued: ts,
      }).eq('id', debt.id)
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
  const [promoApr, setPromoApr] = useState('')
  const [promoEndDate, setPromoEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [accruing, setAccruing] = useState(false)
  const [showPromo, setShowPromo] = useState(false)

  useEffect(() => { loadDebts() }, [])

  async function loadDebts() {
    const { data } = await supabase.from('debts').select('*').order('created_at', { ascending: true })
    if (!data) { setLoading(false); return }
    const overdue = data.filter(d => {
      if (d.paid || !d.due_date || d.last_accrued === todayStr()) return false
      const due = parseDueDate(d.due_date); if (!due) return false
      const today = new Date(); today.setHours(0,0,0,0); due.setHours(0,0,0,0)
      return today > due
    })
    if (overdue.length > 0) {
      setAccruing(true)
      await accrueOverdueInterest(overdue, supabase)
      setAccruing(false)
      const { data: r } = await supabase.from('debts').select('*').order('created_at', { ascending: true })
      setDebts(r || [])
    } else { setDebts(data) }
    setLoading(false)
    window.dispatchEvent(new Event('debt-updated'))
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
      promo_apr: promoApr ? parseFloat(promoApr) : null,
      promo_end_date: promoEndDate || null,
    })
    setName(''); setBalance(''); setMinPayment(''); setApr(''); setDueDate(''); setPromoApr(''); setPromoEndDate(''); setShowPromo(false)
    loadDebts()
  }

  async function updateDebt(id: number, field: string, value: string) {
    const numericFields = ['balance','min_payment','apr','promo_apr']
    const update: any = {}
    update[field] = numericFields.includes(field) ? (value === '' ? null : parseFloat(value) || 0) : (value || null)
    await supabase.from('debts').update(update).eq('id', id)
    loadDebts()
  }

  async function makePayment(debt: any) {
    const currentBalance = Number(debt.balance)
    const minPmt = Number(debt.min_payment)
    const currentDueDate = debt.due_date || ''
    const newBalance = Math.max(0, Math.round((currentBalance - minPmt) * 100) / 100)
    const newDueDate = advanceDueDate(currentDueDate)
    const isPaidOff = newBalance === 0
    await supabase.from('debts').update({
      balance: newBalance, due_date: newDueDate, paid: isPaidOff,
      undo_balance: currentBalance, undo_due_date: currentDueDate, last_accrued: null,
    }).eq('id', debt.id)
    loadDebts()
  }

  async function undoPayment(debt: any) {
    if (debt.undo_balance == null) return
    await supabase.from('debts').update({
      balance: Number(debt.undo_balance), due_date: debt.undo_due_date || debt.due_date,
      paid: false, undo_balance: null, undo_due_date: null, last_accrued: null,
    }).eq('id', debt.id)
    loadDebts()
  }

  async function deleteDebt(id: number) {
    await supabase.from('debts').delete().eq('id', id)
    loadDebts()
  }

  function getDueBadge(d: any) {
    if (d.paid) return <span style={badge('var(--green)','var(--gdim)')}>PAID OFF</span>
    const due = parseDueDate(d.due_date); if (!due) return null
    const diff = Math.ceil((due.getTime() - new Date().getTime()) / (1000*60*60*24))
    if (diff < 0) return <span style={badge('var(--red)','var(--rdim)')}>OVERDUE</span>
    if (diff <= 7) return <span style={badge('var(--amber)','var(--adim)')}>DUE SOON</span>
    return null
  }

  function getPromoBadge(d: any) {
    if (!d.promo_apr && d.promo_apr !== 0) return null
    const end = parseDueDate(d.promo_end_date)
    const isActive = !end || new Date() <= end
    if (!isActive) return null
    return (
      <span style={badge('var(--blue)','var(--bdim)')}>
        {d.promo_apr}% promo{end ? ` → ${d.promo_end_date}` : ''}
      </span>
    )
  }

  function badge(color: string, bg: string) {
    return {fontSize:'10px',fontFamily:'DM Mono,monospace',padding:'2px 7px',borderRadius:'20px',background:bg,color,border:`1px solid ${color}`,whiteSpace:'nowrap' as const}
  }

  function getProgress(balance: number, orig: number) {
    if (!orig || orig <= 0) return 0
    return Math.min(100, Math.round((Math.max(0, orig - balance) / orig) * 100))
  }

  const activeDebts = debts.filter(d => !d.paid)
  const paidDebts = debts.filter(d => d.paid)
  const totalBalance = activeDebts.reduce((s, d) => s + Number(d.balance), 0)
  const totalMin = activeDebts.reduce((s, d) => s + Number(d.min_payment), 0)

  const th: React.CSSProperties = {
    padding:'9px 14px', fontSize:'9px', fontWeight:700, color:'var(--t3)',
    textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'DM Mono,monospace',
    textAlign:'left', background:'rgba(255,255,255,0.02)', borderBottom:'1px solid var(--b)',
    whiteSpace:'nowrap',
  }

  const td = (i: number, extra?: React.CSSProperties): React.CSSProperties => ({
    padding:'11px 14px', fontSize:'13px', borderBottom:'1px solid var(--b)',
    background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
    ...extra,
  })

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div className="page-title">My Debts</div>
              <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'6px'}}>
                Click any value to edit · ✓ Pay subtracts min payment · Interest accrues when overdue
              </div>
            </div>
            {accruing && (
              <span style={{fontSize:'11px',fontFamily:'DM Mono,monospace',color:'var(--amber)',background:'var(--adim)',border:'1px solid var(--amber)',borderRadius:'999px',padding:'4px 12px'}}>
                ⏳ Accruing interest...
              </span>
            )}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'14px'}}>
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
          <div className="card-head">
            <span className="card-title">Add Debt</span>
            <button onClick={() => setShowPromo(!showPromo)} style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color:'var(--blue)',background:'var(--bdim)',border:'1px solid var(--blue)',borderRadius:'999px',padding:'3px 10px',cursor:'pointer'}}>
              {showPromo ? '− Hide Promo Rate' : '+ Add Promo Rate'}
            </button>
          </div>
          <div className="card-body">
            <form onSubmit={addDebt}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto',gap:'10px',alignItems:'end',marginBottom: showPromo ? '12px' : '0'}}>
                {[
                  {label:'Name', el: <input className="fi" type="text" placeholder="Credit Card" value={name} onChange={e => setName(e.target.value)} required />},
                  {label:'Balance', el: <input className="fi" type="number" placeholder="0.00" value={balance} onChange={e => setBalance(e.target.value)} required />},
                  {label:'Min Payment', el: <input className="fi" type="number" placeholder="0.00" value={minPayment} onChange={e => setMinPayment(e.target.value)} required />},
                  {label:'Regular APR %', el: <input className="fi" type="number" placeholder="0.00" value={apr} onChange={e => setApr(e.target.value)} required />},
                  {label:'Due Date', el: <DateInput value={dueDate} onChange={setDueDate} />},
                ].map(({label, el}) => (
                  <div key={label}>
                    <div style={{fontSize:'9px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'4px'}}>{label}</div>
                    {el}
                  </div>
                ))}
                <button type="submit" className="btn-add">Add</button>
              </div>
              {showPromo && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:'10px',alignItems:'end',padding:'12px',background:'var(--bdim)',borderRadius:'12px',border:'1px solid var(--bdim)'}}>
                  <div>
                    <div style={{fontSize:'9px',color:'var(--blue)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'4px'}}>Promo APR % (current rate)</div>
                    <input className="fi" type="number" placeholder="0.00" value={promoApr} onChange={e => setPromoApr(e.target.value)} />
                  </div>
                  <div>
                    <div style={{fontSize:'9px',color:'var(--blue)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'4px'}}>Promo Ends Date</div>
                    <DateInput value={promoEndDate} onChange={setPromoEndDate} />
                  </div>
                  <div style={{fontSize:'11px',color:'var(--t3)',fontFamily:'DM Mono,monospace',paddingBottom:'2px'}}>
                    Rate switches to {apr || '?'}% after end date
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Active Debts</span>
            <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'999px',padding:'2px 10px',color:'var(--t3)'}}>{activeDebts.length} total</span>
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
                    {['Name','Balance','Min Pmt','APR','Effective APR','Due Date','Est. Interest','Total Due','Progress',''].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeDebts.map((d, i) => {
                    const progress = getProgress(Number(d.balance), Number(d.orig_balance))
                    const effectiveApr = getEffectiveApr(d)
                    const dueInfo = calcDueInfo(Number(d.balance), effectiveApr, d.due_date)
                    const isOverdue = dueInfo && dueInfo.days < 0
                    const hasPromo = d.promo_apr != null
                    return (
                      <tr key={d.id} style={{background: isOverdue ? 'rgba(255,91,91,0.03)' : 'transparent'}}>
                        <td style={td(i)}>
                          <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                            <EditableCell value={d.name} onChange={v => updateDebt(d.id,'name',v)} />
                            {getDueBadge(d)}
                            {getPromoBadge(d)}
                          </div>
                        </td>
                        <td style={td(i)}>
                          <EditableCell value={Number(d.balance).toFixed(2)} onChange={v => updateDebt(d.id,'balance',v)} type="number" color="var(--red)" />
                        </td>
                        <td style={td(i)}>
                          <EditableCell value={Number(d.min_payment).toFixed(2)} onChange={v => updateDebt(d.id,'min_payment',v)} type="number" color="var(--amber)" />
                        </td>
                        <td style={td(i)}>
                          <EditableCell value={String(d.apr)} onChange={v => updateDebt(d.id,'apr',v)} type="number" color="var(--amber)" />
                        </td>
                        <td style={td(i)}>
                          <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                            {hasPromo ? (
                              <>
                                <span style={{fontFamily:'DM Mono,monospace',fontSize:'13px',color:'var(--blue)',fontWeight:600}}>{effectiveApr}%</span>
                                {d.promo_end_date && (
                                  <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                                    <EditableCell value={d.promo_apr != null ? String(d.promo_apr) : ''} onChange={v => updateDebt(d.id,'promo_apr',v)} type="number" color="var(--blue)" />
                                    <span style={{fontSize:'9px',color:'var(--t3)',fontFamily:'DM Mono,monospace'}}>→</span>
                                    <EditableCell value={d.promo_end_date || ''} onChange={v => updateDebt(d.id,'promo_end_date',v)} color="var(--blue)" isDate />
                                  </div>
                                )}
                              </>
                            ) : (
                              <span style={{fontFamily:'DM Mono,monospace',fontSize:'13px',color:'var(--amber)'}}>{effectiveApr}%</span>
                            )}
                          </div>
                        </td>
                        <td style={td(i)}>
                          <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                            <EditableCell value={d.due_date||''} onChange={v => updateDebt(d.id,'due_date',v)} color={isOverdue ? 'var(--red)' : 'var(--blue)'} isDate />
                            {dueInfo && (
                              <span style={{fontSize:'9px',fontFamily:'DM Mono,monospace',color:dueInfo.days<0?'var(--red)':dueInfo.days<=7?'var(--amber)':'var(--t3)'}}>
                                {dueInfo.days<0?`${Math.abs(dueInfo.days)}d overdue`:dueInfo.days===0?'due today':`${dueInfo.days}d left`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={td(i)}>
                          {dueInfo ? <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px',color:'var(--amber)'}}>+${dueInfo.interest.toFixed(2)}</span> : <span style={{color:'var(--t3)'}}>—</span>}
                        </td>
                        <td style={td(i)}>
                          {dueInfo ? <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px',color:'var(--red)',fontWeight:600}}>${dueInfo.totalDue.toFixed(2)}</span> : <span style={{color:'var(--t3)'}}>—</span>}
                        </td>
                        <td style={td(i)}>
                          <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                            <div style={{width:'60px',height:'5px',background:'var(--s3)',borderRadius:'999px',overflow:'hidden'}}>
                              <div style={{height:'100%',borderRadius:'999px',background:progress>66?'var(--green)':progress>33?'var(--amber)':'var(--red)',width:`${progress}%`,transition:'width .3s'}} />
                            </div>
                            <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color:'var(--t3)'}}>{progress}%</span>
                          </div>
                        </td>
                        <td style={td(i)}>
                          <div style={{display:'flex',gap:'5px',alignItems:'center'}}>
                            <button onClick={() => makePayment(d)} style={{fontSize:'10px',fontFamily:'DM Mono,monospace',padding:'5px 9px',borderRadius:'999px',cursor:'pointer',border:'1px solid var(--green)',background:'transparent',color:'var(--green)',whiteSpace:'nowrap',transition:'all .14s'}}>✓ Pay</button>
                            {d.undo_balance!=null && <button onClick={() => undoPayment(d)} style={{fontSize:'10px',fontFamily:'DM Mono,monospace',padding:'5px 9px',borderRadius:'999px',cursor:'pointer',border:'1px solid var(--amber)',background:'transparent',color:'var(--amber)',whiteSpace:'nowrap'}}>Undo</button>}
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
              <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',background:'var(--gdim)',border:'1px solid var(--green)',borderRadius:'999px',padding:'2px 10px',color:'var(--green)'}}>{paidDebts.length} paid</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <tbody>
                  {paidDebts.map((d,i) => (
                    <tr key={d.id} style={{opacity:0.55}}>
                      <td style={td(i)}>{d.name} <span style={badge('var(--green)','var(--gdim)')}>PAID OFF</span></td>
                      <td style={{...td(i),fontFamily:'DM Mono,monospace',color:'var(--green)'}}>$0.00</td>
                      <td style={td(i)}>
                        <div style={{display:'flex',gap:'5px'}}>
                          <button onClick={() => undoPayment(d)} style={{fontSize:'10px',fontFamily:'DM Mono,monospace',padding:'5px 9px',borderRadius:'999px',cursor:'pointer',border:'1px solid var(--amber)',background:'transparent',color:'var(--amber)'}}>Undo</button>
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