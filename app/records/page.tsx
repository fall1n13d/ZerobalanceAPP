'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function RecordsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [records, setRecords] = useState<any[]>([])
  const [month, setMonth] = useState('')
  const [totalDebt, setTotalDebt] = useState('')
  const [totalPaid, setTotalPaid] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => { loadRecords() }, [])

  async function loadRecords() {
    const { data } = await supabase.from('records').select('*').order('created_at', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return null }
    return user
  }

  async function addRecord(e: any) {
    e.preventDefault()
    const user = await getUser(); if (!user) return
    await supabase.from('records').insert({
      user_id: user.id,
      month,
      total_debt: parseFloat(totalDebt),
      total_paid: parseFloat(totalPaid),
      notes,
      snapshot: null,
    })
    setMonth(''); setTotalDebt(''); setTotalPaid(''); setNotes('')
    loadRecords()
  }

  async function deleteRecord(id: number) {
    const confirmed = window.confirm('Delete this record?')
    if (!confirmed) return
    await supabase.from('records').delete().eq('id', id)
    loadRecords()
  }

  async function undoArchive(record: any) {
    if (!record.snapshot) {
      alert('No snapshot data found for this record.')
      return
    }

    const confirmed = window.confirm(`Restore ${record.month} back to Budget?\n\nThis will re-add all paychecks, extra income, expenses and bills from this month.`)
    if (!confirmed) return

    const snap = record.snapshot
    const user = await getUser(); if (!user) return

    const inserts: Promise<any>[] = []

    if (snap.paychecks?.length) {
      inserts.push(supabase.from('paychecks').insert(snap.paychecks))
    }
    if (snap.extraIncome?.length) {
      inserts.push(supabase.from('extra_income').insert(snap.extraIncome))
    }
    if (snap.expenses?.length) {
      inserts.push(supabase.from('expenses').insert(snap.expenses))
    }

    await Promise.all(inserts)

    const deleteConfirmed = window.confirm(`Data restored to Budget! Do you also want to delete this record from Records?`)
    if (deleteConfirmed) {
      await supabase.from('records').delete().eq('id', record.id)
      loadRecords()
    }

    alert(`${record.month} has been restored to Budget.`)
    router.push('/budget')
  }

  const totalPaidAll = records.reduce((sum, r) => sum + Number(r.total_paid), 0)

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <div className="page-title">Records</div>
          <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'8px'}}>Your archived monthly history</div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'14px',marginBottom:'16px'}}>
          <div className="metric-card">
            <div className="metric-label">Total Months Archived</div>
            <div className="metric-value green">{records.length}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Income All Time</div>
            <div className="metric-value amber">${totalPaidAll.toFixed(2)}</div>
          </div>
        </div>

        <div className="card" style={{marginBottom:'16px'}}>
          <div className="card-head">
            <span className="card-title">Add Manual Record</span>
          </div>
          <div className="card-body">
            <form onSubmit={addRecord} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:'10px',alignItems:'end'}}>
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Month</div>
                <input className="fi" type="text" placeholder="April 2026" value={month} onChange={e => setMonth(e.target.value)} required />
              </div>
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Total Debt</div>
                <input className="fi" type="number" placeholder="0.00" value={totalDebt} onChange={e => setTotalDebt(e.target.value)} required />
              </div>
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Total Paid</div>
                <input className="fi" type="number" placeholder="0.00" value={totalPaid} onChange={e => setTotalPaid(e.target.value)} required />
              </div>
              <button type="submit" className="btn-add">Add</button>
            </form>
            <div style={{marginTop:'10px'}}>
              <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Notes (optional)</div>
              <input className="fi" type="text" placeholder="Any notes..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Monthly Records</span>
            <span style={{fontSize:'11px',fontFamily:'DM Mono,monospace',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'999px',padding:'3px 10px',color:'var(--t3)'}}>{records.length} months</span>
          </div>
          {loading ? (
            <div className="card-body"><p style={{color:'var(--t3)'}}>Loading...</p></div>
          ) : records.length === 0 ? (
            <div className="card-body"><p style={{color:'var(--t3)'}}>No records yet. Archive a month from the Budget page.</p></div>
          ) : (
            records.map((r) => {
              const snap = r.snapshot
              const isExpanded = expanded === r.id
              return (
                <div key={r.id} style={{borderBottom:'1px solid var(--b)'}}>
                  <div
                    style={{padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}
                    onClick={() => setExpanded(isExpanded ? null : r.id)}
                  >
                    <div>
                      <div style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'15px',marginBottom:'4px'}}>{r.month}</div>
                      <div style={{fontSize:'12px',color:'var(--t3)',fontFamily:'DM Mono,monospace'}}>{r.notes}</div>
                    </div>
                    <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                      {snap && (
                        <button
                          onClick={(e) => { e.stopPropagation(); undoArchive(r) }}
                          style={{fontSize:'11px',fontFamily:'DM Mono,monospace',padding:'6px 12px',borderRadius:'999px',cursor:'pointer',border:'1px solid var(--amber)',background:'transparent',color:'var(--amber)',whiteSpace:'nowrap',transition:'all .14s'}}
                        >
                          ↩ Restore to Budget
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteRecord(r.id) }}
                        className="btn-del"
                      >
                        ✕
                      </button>
                      <span style={{color:'var(--t3)',fontSize:'12px'}}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isExpanded && snap && (
                    <div style={{padding:'0 18px 18px',borderTop:'1px solid var(--b)'}}>
                      {snap.paychecks?.length > 0 && (
                        <div style={{marginTop:'14px'}}>
                          <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>Paychecks</div>
                          {snap.paychecks.map((p: any, i: number) => (
                            <div key={i} className="row-item">
                              <span style={{fontSize:'12px',color:'var(--t2)'}}>{p.date}</span>
                              <span className="mono green">${Number(p.amount).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {snap.extraIncome?.length > 0 && (
                        <div style={{marginTop:'14px'}}>
                          <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>Extra Income</div>
                          {snap.extraIncome.map((e: any, i: number) => (
                            <div key={i} className="row-item">
                              <span style={{fontSize:'12px',color:'var(--t2)'}}>{e.description}</span>
                              <span className="mono green">${Number(e.amount).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {snap.bills?.length > 0 && (
                        <div style={{marginTop:'14px'}}>
                          <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>Bills</div>
                          {snap.bills.map((b: any, i: number) => (
                            <div key={i} className="row-item">
                              <span style={{fontSize:'12px',color:'var(--t2)'}}>{b.name}</span>
                              <span className="mono amber">${Number(b.amount).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {snap.expenses?.length > 0 && (
                        <div style={{marginTop:'14px'}}>
                          <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>Expenses</div>
                          {snap.expenses.map((e: any, i: number) => (
                            <div key={i} className="row-item">
                              <span style={{fontSize:'12px',color:'var(--t2)'}}>{e.description}{e.note ? ` · ${e.note}` : ''}</span>
                              <span className="mono" style={{color:'var(--purple)'}}>${Number(e.amount).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}