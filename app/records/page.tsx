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

  useEffect(() => { loadRecords() }, [])

  async function loadRecords() {
    const { data } = await supabase.from('records').select('*').order('created_at', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  async function addRecord(e: any) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    await supabase.from('records').insert({
      user_id: user.id,
      month,
      total_debt: parseFloat(totalDebt),
      total_paid: parseFloat(totalPaid),
      notes,
    })
    setMonth(''); setTotalDebt(''); setTotalPaid(''); setNotes('')
    loadRecords()
  }

  async function deleteRecord(id: number) {
    await supabase.from('records').delete().eq('id', id)
    loadRecords()
  }

  const totalPaidAll = records.reduce((sum, r) => sum + Number(r.total_paid), 0)

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <div className="page-title">Records</div>
          <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'8px'}}>Track your monthly progress</div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'14px',marginBottom:'16px'}}>
          <div className="metric-card">
            <div className="metric-label">Total Months Tracked</div>
            <div className="metric-value green">{records.length}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Paid All Time</div>
            <div className="metric-value amber">${totalPaidAll.toFixed(2)}</div>
          </div>
        </div>

        <div className="card" style={{marginBottom:'16px'}}>
          <div className="card-head">
            <span className="card-title">Add Monthly Record</span>
          </div>
          <div className="card-body">
            <form onSubmit={addRecord} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:'10px',alignItems:'end'}}>
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Month</div>
                <input className="fi" type="text" placeholder="April 2026" value={month} onChange={(e) => setMonth(e.target.value)} required />
              </div>
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Total Debt</div>
                <input className="fi" type="number" placeholder="0.00" value={totalDebt} onChange={(e) => setTotalDebt(e.target.value)} required />
              </div>
              <div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Paid This Month</div>
                <input className="fi" type="number" placeholder="0.00" value={totalPaid} onChange={(e) => setTotalPaid(e.target.value)} required />
              </div>
              <button type="submit" className="btn-add">Add</button>
            </form>
            <div style={{marginTop:'10px'}}>
              <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Notes (optional)</div>
              <input className="fi" type="text" placeholder="Any notes for this month..." value={notes} onChange={(e) => setNotes(e.target.value)} />
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
            <div className="card-body"><p style={{color:'var(--t3)'}}>No records yet.</p></div>
          ) : (
            records.map((r) => (
              <div key={r.id} style={{padding:'14px 18px',borderBottom:'1px solid var(--b)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'15px',marginBottom:'4px'}}>{r.month}</div>
                  <div style={{display:'flex',gap:'16px'}}>
                    <span style={{fontSize:'12px',fontFamily:'DM Mono,monospace',color:'var(--red)'}}>Debt: ${Number(r.total_debt).toFixed(2)}</span>
                    <span style={{fontSize:'12px',fontFamily:'DM Mono,monospace',color:'var(--green)'}}>Paid: ${Number(r.total_paid).toFixed(2)}</span>
                  </div>
                  {r.notes && <div style={{fontSize:'12px',color:'var(--t3)',marginTop:'4px'}}>{r.notes}</div>}
                </div>
                <button onClick={() => deleteRecord(r.id)} className="btn-del">✕</button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}