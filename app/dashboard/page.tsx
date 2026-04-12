'use client'

import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function Dashboard() {
  const supabase = createClient()
  const [totalDebt, setTotalDebt] = useState(0)
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [monthlyBills, setMonthlyBills] = useState(0)
  const [debtCount, setDebtCount] = useState(0)
  const [paidCount, setPaidCount] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    const [{ data: debts }, { data: bills }, { data: paychecks }, { data: extra }] = await Promise.all([
      supabase.from('debts').select('balance, paid'),
      supabase.from('bills').select('amount'),
      supabase.from('paychecks').select('amount, date'),
      supabase.from('extra_income').select('amount, date'),
    ])
    const now = new Date()
    const thisMonth = (items: any[]) => items?.filter(i => {
      const parts = i.date?.split('/')
      if (!parts || parts.length !== 3) return false
      return parseInt(parts[2]) === now.getFullYear() && parseInt(parts[0]) - 1 === now.getMonth()
    }) || []
    const activeDebts = debts?.filter(d => !d.paid) || []
    const paid = debts?.filter(d => d.paid) || []
    setTotalDebt(activeDebts.reduce((s, d) => s + Number(d.balance), 0))
    setDebtCount(activeDebts.length)
    setPaidCount(paid.length)
    setMonthlyBills(bills?.reduce((s, b) => s + Number(b.amount), 0) || 0)
    setMonthlyIncome([...thisMonth(paychecks || []), ...thisMonth(extra || [])].reduce((s, i) => s + Number(i.amount), 0))
  }

  async function exportBackup() {
    setExporting(true)
    try {
      const [
        { data: debts },
        { data: bills },
        { data: earners },
        { data: paychecks },
        { data: extraIncome },
        { data: expenses },
        { data: records },
      ] = await Promise.all([
        supabase.from('debts').select('*'),
        supabase.from('bills').select('*'),
        supabase.from('earners').select('*'),
        supabase.from('paychecks').select('*'),
        supabase.from('extra_income').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('records').select('*'),
      ])

      const backup = {
        exported_at: new Date().toISOString(),
        version: 1,
        debts: debts || [],
        bills: bills || [],
        earners: earners || [],
        paychecks: paychecks || [],
        extra_income: extraIncome || [],
        expenses: expenses || [],
        records: records || [],
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zero-balance-backup-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Export failed')
    }
    setExporting(false)
  }

  async function importBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!data.version || !Array.isArray(data.debts)) {
        alert('Invalid backup file')
        setImporting(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setImporting(false); return }
      const uid = user.id

      const choice = window.confirm(
        `Backup from: ${data.exported_at?.slice(0,10) || 'unknown date'}\n\n` +
        `Contains:\n` +
        `• ${data.debts?.length || 0} debts\n` +
        `• ${data.bills?.length || 0} bills\n` +
        `• ${data.earners?.length || 0} earners\n` +
        `• ${data.paychecks?.length || 0} paychecks\n` +
        `• ${data.expenses?.length || 0} expenses\n` +
        `• ${data.records?.length || 0} records\n\n` +
        `Click OK to REPLACE all current data.\n` +
        `Click Cancel to ADD to existing data.`
      )

      if (choice) {
        // Replace — delete all first
        await Promise.all([
          supabase.from('paychecks').delete().eq('user_id', uid),
          supabase.from('earners').delete().eq('user_id', uid),
          supabase.from('debts').delete().eq('user_id', uid),
          supabase.from('bills').delete().eq('user_id', uid),
          supabase.from('extra_income').delete().eq('user_id', uid),
          supabase.from('expenses').delete().eq('user_id', uid),
          supabase.from('records').delete().eq('user_id', uid),
        ])
      }

      const strip = (items: any[]) => items.map(({ id, ...rest }: any) => ({ ...rest, user_id: uid }))

      // Insert debts, bills, extra income, expenses, records directly
      if (data.debts?.length) await supabase.from('debts').insert(strip(data.debts))
      if (data.bills?.length) await supabase.from('bills').insert(strip(data.bills))
      if (data.extra_income?.length) await supabase.from('extra_income').insert(strip(data.extra_income))
      if (data.expenses?.length) await supabase.from('expenses').insert(strip(data.expenses))
      if (data.records?.length) await supabase.from('records').insert(strip(data.records))

      // Insert earners and map old IDs to new IDs for paychecks
      if (data.earners?.length) {
        const earnerIdMap: Record<number, number> = {}
        for (const earner of data.earners) {
          const oldId = earner.id
          const { data: inserted } = await supabase
            .from('earners')
            .insert({ user_id: uid, name: earner.name, freq: earner.freq })
            .select()
            .single()
          if (inserted) {
            earnerIdMap[oldId] = inserted.id
          }
        }

        // Insert paychecks with remapped earner IDs
        if (data.paychecks?.length) {
          const paychecksToInsert = data.paychecks.map(({ id, ...p }: any) => ({
            user_id: uid,
            earner_id: earnerIdMap[p.earner_id] || p.earner_id,
            amount: p.amount,
            date: p.date,
          }))
          await supabase.from('paychecks').insert(paychecksToInsert)
        }
      } else if (data.paychecks?.length) {
        await supabase.from('paychecks').insert(strip(data.paychecks))
      }

      alert(`Backup ${choice ? 'restored' : 'merged'} successfully!`)
      loadData()
    } catch (err) {
      alert('Import failed — invalid backup file')
      console.error(err)
    }

    setImporting(false)
    e.target.value = ''
  }

  const cards = [
    { href: '/debts', emoji: '💳', label: 'My Debts', value: `$${totalDebt.toFixed(2)}`, sub: `${debtCount} active · ${paidCount} paid off`, color: 'var(--red)', dimColor: 'var(--rdim)', borderColor: 'rgba(255,91,91,0.3)' },
    { href: '/budget', emoji: '💰', label: 'Budget', value: `$${monthlyIncome.toFixed(2)}`, sub: 'This month income', color: 'var(--green)', dimColor: 'var(--gdim)', borderColor: 'rgba(61,255,160,0.3)' },
    { href: '/records', emoji: '📋', label: 'Records', value: 'History', sub: 'Monthly archives', color: 'var(--blue)', dimColor: 'var(--bdim)', borderColor: 'rgba(96,165,250,0.3)' },
    { href: '/snowball', emoji: '❄️', label: 'Snowball', value: 'Payoff Plan', sub: 'Avalanche & snowball', color: 'var(--purple)', dimColor: 'var(--pdim)', borderColor: 'rgba(192,132,252,0.3)' },
  ]

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <div style={{marginBottom:'32px',padding:'32px',border:'1px solid var(--b)',borderRadius:'28px',background:'var(--card-bg)',boxShadow:'var(--shadow)',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:'linear-gradient(90deg,var(--green),var(--blue),var(--purple))',borderRadius:'28px 28px 0 0'}} />
          <div style={{position:'absolute',top:'-60px',right:'-60px',width:'200px',height:'200px',borderRadius:'50%',background:'var(--gdim)',filter:'blur(40px)',pointerEvents:'none'}} />
          <div style={{fontSize:'12px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:'8px'}}>Welcome back</div>
          <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'38px',letterSpacing:'-1.5px',marginBottom:'8px'}}>Zero Balance</div>
          <div style={{fontSize:'14px',color:'var(--t3)',maxWidth:'480px',lineHeight:1.6,marginBottom:'20px'}}>
            {user?.email} · Your debt freedom dashboard
          </div>

          <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'20px'}}>
            <div style={{background:'var(--rdim)',border:'1px solid rgba(255,91,91,0.3)',borderRadius:'12px',padding:'10px 16px'}}>
              <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'2px'}}>Total Debt</div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'20px',fontWeight:600,color:'var(--red)'}}>${totalDebt.toFixed(2)}</div>
            </div>
            <div style={{background:'var(--adim)',border:'1px solid rgba(255,184,48,0.3)',borderRadius:'12px',padding:'10px 16px'}}>
              <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'2px'}}>Monthly Bills</div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'20px',fontWeight:600,color:'var(--amber)'}}>${monthlyBills.toFixed(2)}</div>
            </div>
            <div style={{background:'var(--gdim)',border:'1px solid rgba(61,255,160,0.3)',borderRadius:'12px',padding:'10px 16px'}}>
              <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'2px'}}>This Month Income</div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'20px',fontWeight:600,color:'var(--green)'}}>${monthlyIncome.toFixed(2)}</div>
            </div>
          </div>

          <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
            <button
              onClick={exportBackup}
              disabled={exporting}
              style={{background:'var(--s2)',border:'1px solid var(--b2)',borderRadius:'12px',color:'var(--t2)',fontFamily:'DM Mono,monospace',fontSize:'11px',padding:'9px 14px',cursor:'pointer',transition:'all .15s',display:'flex',alignItems:'center',gap:'6px'}}
            >
              {exporting ? '⏳ Exporting...' : '⬇️ Export Backup'}
            </button>
            <label style={{background:'var(--s2)',border:'1px solid var(--b2)',borderRadius:'12px',color:'var(--t2)',fontFamily:'DM Mono,monospace',fontSize:'11px',padding:'9px 14px',cursor:'pointer',transition:'all .15s',display:'flex',alignItems:'center',gap:'6px'}}>
              {importing ? '⏳ Importing...' : '⬆️ Import Backup'}
              <input type="file" accept=".json" onChange={importBackup} style={{display:'none'}} />
            </label>
          </div>
          <div style={{marginTop:'10px',fontSize:'11px',color:'var(--t3)',fontFamily:'DM Mono,monospace'}}>
            Import: OK = Replace all data · Cancel = Add to existing
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'16px'}}>
          {cards.map((card) => (
            <Link key={card.href} href={card.href} style={{textDecoration:'none'}}>
              <div
                style={{background:'var(--card-bg)',border:`1px solid ${card.borderColor}`,borderRadius:'22px',padding:'24px',boxShadow:`var(--shadow), 0 0 40px ${card.dimColor}`,transition:'all .2s',position:'relative',overflow:'hidden',cursor:'pointer'}}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)' }}
              >
                <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:card.color,borderRadius:'22px 22px 0 0',opacity:.7}} />
                <div style={{position:'absolute',bottom:'-30px',right:'-20px',fontSize:'80px',opacity:.06,pointerEvents:'none',userSelect:'none'}}>{card.emoji}</div>
                <div style={{fontSize:'28px',marginBottom:'12px'}}>{card.emoji}</div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:'6px'}}>{card.label}</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'24px',fontWeight:600,color:card.color,marginBottom:'4px'}}>{card.value}</div>
                <div style={{fontSize:'12px',color:'var(--t3)'}}>{card.sub}</div>
                <div style={{marginTop:'16px',fontSize:'11px',fontFamily:'DM Mono,monospace',color:card.color,opacity:.7}}>View →</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}