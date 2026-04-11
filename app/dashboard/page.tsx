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

  useEffect(() => {
    loadData()
  }, [])

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

  const cards = [
    {
      href: '/debts',
      emoji: '💳',
      label: 'My Debts',
      value: `$${totalDebt.toFixed(2)}`,
      sub: `${debtCount} active · ${paidCount} paid off`,
      color: 'var(--red)',
      dimColor: 'var(--rdim)',
      borderColor: 'rgba(255,91,91,0.3)',
    },
    {
      href: '/budget',
      emoji: '💰',
      label: 'Budget',
      value: `$${monthlyIncome.toFixed(2)}`,
      sub: 'This month income',
      color: 'var(--green)',
      dimColor: 'var(--gdim)',
      borderColor: 'rgba(61,255,160,0.3)',
    },
    {
      href: '/records',
      emoji: '📋',
      label: 'Records',
      value: 'History',
      sub: 'Monthly archives',
      color: 'var(--blue)',
      dimColor: 'var(--bdim)',
      borderColor: 'rgba(96,165,250,0.3)',
    },
    {
      href: '/snowball',
      emoji: '❄️',
      label: 'Snowball',
      value: 'Payoff Plan',
      sub: 'Avalanche & snowball',
      color: 'var(--purple)',
      dimColor: 'var(--pdim)',
      borderColor: 'rgba(192,132,252,0.3)',
    },
  ]

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <div style={{marginBottom:'32px',padding:'32px',border:'1px solid var(--b)',borderRadius:'28px',background:'var(--card-bg)',boxShadow:'var(--shadow)',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:'linear-gradient(90deg,var(--green),var(--blue),var(--purple))',borderRadius:'28px 28px 0 0'}} />
          <div style={{position:'absolute',top:'-60px',right:'-60px',width:'200px',height:'200px',borderRadius:'50%',background:'var(--gdim)',filter:'blur(40px)',pointerEvents:'none'}} />
          <div style={{fontSize:'12px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:'8px'}}>
            Welcome back
          </div>
          <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'38px',letterSpacing:'-1.5px',marginBottom:'8px'}}>
            Zero Balance
          </div>
          <div style={{fontSize:'14px',color:'var(--t3)',maxWidth:'480px',lineHeight:1.6}}>
            {user?.email} · Your debt freedom dashboard
          </div>
          <div style={{marginTop:'20px',display:'flex',gap:'12px',flexWrap:'wrap'}}>
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
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'16px'}}>
          {cards.map((card) => (
            <Link key={card.href} href={card.href} style={{textDecoration:'none'}}>
              <div style={{
                background:'var(--card-bg)',
                border:`1px solid ${card.borderColor}`,
                borderRadius:'22px',
                padding:'24px',
                boxShadow:`var(--shadow), 0 0 40px ${card.dimColor}`,
                transition:'all .2s',
                position:'relative',
                overflow:'hidden',
                cursor:'pointer',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'translateY(-3px)'
                el.style.boxShadow = `var(--shadow), 0 0 60px ${card.dimColor}`
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = `var(--shadow), 0 0 40px ${card.dimColor}`
              }}
              >
                <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:card.color,borderRadius:'22px 22px 0 0',opacity:.7}} />
                <div style={{position:'absolute',bottom:'-30px',right:'-20px',fontSize:'80px',opacity:.06,pointerEvents:'none',userSelect:'none'}}>
                  {card.emoji}
                </div>
                <div style={{fontSize:'28px',marginBottom:'12px'}}>{card.emoji}</div>
                <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:'6px'}}>{card.label}</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'24px',fontWeight:600,color:card.color,marginBottom:'4px'}}>{card.value}</div>
                <div style={{fontSize:'12px',color:'var(--t3)'}}>{card.sub}</div>
                <div style={{marginTop:'16px',fontSize:'11px',fontFamily:'DM Mono,monospace',color:card.color,opacity:.7}}>
                  View → 
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}