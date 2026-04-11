'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [metrics, setMetrics] = useState({
    totalDebt: 0,
    minPayments: 0,
    monthlyBills: 0,
    monthlyExpenses: 0,
    monthlyIncome: 0,
    leftover: 0,
  })
  const [upcoming, setUpcoming] = useState<any[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('zb-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
    loadMetrics()
  }, [pathname])

  async function loadMetrics() {
    const [
      { data: debts },
      { data: bills },
      { data: paychecks },
      { data: extraIncome },
      { data: expenses },
    ] = await Promise.all([
      supabase.from('debts').select('balance, min_payment, apr, name, due_date, paid'),
      supabase.from('bills').select('amount, name'),
      supabase.from('paychecks').select('amount, date'),
      supabase.from('extra_income').select('amount, date'),
      supabase.from('expenses').select('amount, date'),
    ])

    const now = new Date()
    const thisMonth = (items: any[]) => items?.filter(i => {
      const parts = i.date?.split('/')
      if (!parts || parts.length !== 3) return false
      return parseInt(parts[2]) === now.getFullYear() && parseInt(parts[0]) - 1 === now.getMonth()
    }) || []

    const activeDebts = debts?.filter(d => !d.paid) || []
    const totalDebt = activeDebts.reduce((s, d) => s + Number(d.balance), 0)
    const minPayments = activeDebts.reduce((s, d) => s + Number(d.min_payment), 0)
    const monthlyBills = bills?.reduce((s, b) => s + Number(b.amount), 0) || 0
    const monthlyExpenses = thisMonth(expenses || []).reduce((s, e) => s + Number(e.amount), 0)
    const monthlyIncome = [
      ...thisMonth(paychecks || []),
      ...thisMonth(extraIncome || [])
    ].reduce((s, i) => s + Number(i.amount), 0)
    const leftover = monthlyIncome - monthlyBills - monthlyExpenses - minPayments

    setMetrics({ totalDebt, minPayments, monthlyBills, monthlyExpenses, monthlyIncome, leftover })

    // Upcoming payments — debts with due dates in next 14 days
    const upcomingDebts = activeDebts.filter(d => {
      if (!d.due_date) return false
      const parts = d.due_date.split('/')
      if (parts.length !== 3) return false
      const due = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]))
      const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return diff >= -1 && diff <= 14
    }).map(d => {
      const parts = d.due_date.split('/')
      const due = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]))
      const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return { ...d, daysUntil: diff }
    }).sort((a, b) => a.daysUntil - b.daysUntil)

    setUpcoming(upcomingDebts)
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('zb-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: '/dashboard', label: '🏠 Dashboard' },
    { href: '/debts', label: '💳 My Debts' },
    { href: '/budget', label: '💰 Budget' },
    { href: '/records', label: '📋 Records' },
    { href: '/snowball', label: '❄️ Snowball' },
  ]

  const sm = (label: string, value: string, color: string) => (
    <div style={{background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'14px',padding:'10px 12px',marginBottom:'8px'}}>
      <div style={{fontSize:'10px',color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.07em',fontFamily:'DM Mono,monospace',marginBottom:'2px'}}>{label}</div>
      <div style={{fontFamily:'DM Mono,monospace',fontSize:'14px',fontWeight:500,color}}>{value}</div>
    </div>
  )

  return (
    <>
      {/* Mobile header */}
      <div style={{display:'none',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',background:'var(--surface)',borderBottom:'1px solid var(--b)',position:'sticky',top:0,zIndex:100}} className="mobile-header">
        <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'16px',color:'var(--green)'}}>Zero Balance</div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <button onClick={toggleTheme} style={{background:'var(--s2)',border:'1px solid var(--b2)',borderRadius:'999px',padding:'5px 10px',fontSize:'13px',cursor:'pointer',color:'var(--text)'}}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} style={{background:'none',border:'1px solid var(--b2)',borderRadius:'10px',color:'var(--text)',padding:'7px 10px',cursor:'pointer',fontSize:'16px'}}>
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div style={{display:'none',flexDirection:'column',background:'var(--surface)',borderBottom:'1px solid var(--b)',padding:'12px 16px',gap:'8px',position:'sticky',top:'49px',zIndex:99}} className="mobile-nav">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={`nav-item${pathname === link.href ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="btn-logout" style={{marginTop:'8px'}}>Sign Out</button>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-name">Zero Balance</div>
          <div className="logo-sub">Debt Freedom System</div>
        </div>

        <div style={{padding:'12px 18px',borderBottom:'1px solid var(--b)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:'11px',color:'var(--t3)',fontFamily:'DM Mono,monospace'}}>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          <button onClick={toggleTheme} style={{background:'var(--s2)',border:'1px solid var(--b2)',borderRadius:'999px',padding:'5px 12px',fontSize:'13px',cursor:'pointer',color:'var(--text)'}}>
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        {/* Metrics */}
        <div style={{padding:'14px 18px',borderBottom:'1px solid var(--b)'}}>
          {sm('Total Debt', `$${metrics.totalDebt.toFixed(2)}`, 'var(--red)')}
          {sm('Monthly Income', `$${metrics.monthlyIncome.toFixed(2)}`, 'var(--green)')}
          {sm('Monthly Bills', `$${metrics.monthlyBills.toFixed(2)}`, 'var(--amber)')}
          {sm('Monthly Expenses', `$${metrics.monthlyExpenses.toFixed(2)}`, 'var(--purple)')}
          {sm('Debt Payments', `$${metrics.minPayments.toFixed(2)}`, 'var(--red)')}
          <div style={{background: metrics.leftover >= 0 ? 'var(--gdim)' : 'var(--rdim)', border:`1px solid ${metrics.leftover >= 0 ? 'var(--green)' : 'var(--red)'}`,borderRadius:'14px',padding:'10px 12px',marginBottom:'8px'}}>
            <div style={{fontSize:'10px',color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.07em',fontFamily:'DM Mono,monospace',marginBottom:'2px'}}>Leftover</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'14px',fontWeight:500,color: metrics.leftover >= 0 ? 'var(--green)' : 'var(--red)'}}>
              ${metrics.leftover.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Upcoming Payments */}
        {upcoming.length > 0 && (
          <div style={{padding:'14px 18px',borderBottom:'1px solid var(--b)'}}>
            <div style={{fontSize:'10px',color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.08em',fontFamily:'DM Mono,monospace',marginBottom:'10px'}}>⚠️ Upcoming Payments</div>
            {upcoming.map((d, i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                <div>
                  <div style={{fontSize:'12px',color:'var(--t2)'}}>{d.name}</div>
                  <div style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color: d.daysUntil < 0 ? 'var(--red)' : d.daysUntil <= 3 ? 'var(--red)' : 'var(--amber)'}}>
                    {d.daysUntil < 0 ? `${Math.abs(d.daysUntil)}d overdue` : d.daysUntil === 0 ? 'Due today' : `Due in ${d.daysUntil}d`}
                  </div>
                </div>
                <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px',color:'var(--amber)'}}>${Number(d.min_payment).toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}

        <nav className="nav-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={`nav-item${pathname === link.href ? ' active' : ''}`}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="nav-logout">
          <button onClick={handleLogout} className="btn-logout">Sign Out</button>
        </div>
      </aside>
    </>
  )
}