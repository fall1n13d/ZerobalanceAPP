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

  useEffect(() => {
    const saved = localStorage.getItem('zb-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

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

  return (
    <>
      {/* Mobile header */}
      <div style={{display:'none',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',background:'var(--surface)',borderBottom:'1px solid var(--b)',position:'sticky',top:0,zIndex:100}} className="mobile-header">
        <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'16px',color:'var(--green)'}}>Zero Balance</div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <button
            onClick={toggleTheme}
            style={{background:'var(--s2)',border:'1px solid var(--b2)',borderRadius:'999px',padding:'5px 10px',fontSize:'13px',cursor:'pointer',color:'var(--text)',transition:'all .2s'}}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{background:'none',border:'1px solid var(--b2)',borderRadius:'10px',color:'var(--text)',padding:'7px 10px',cursor:'pointer',fontSize:'16px'}}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div style={{display:'none',flexDirection:'column',background:'var(--surface)',borderBottom:'1px solid var(--b)',padding:'12px 16px',gap:'8px',position:'sticky',top:'49px',zIndex:99}} className="mobile-nav">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-item${pathname === link.href ? ' active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="btn-logout" style={{marginTop:'8px'}}>
            Sign Out
          </button>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-name">Zero Balance</div>
          <div className="logo-sub">Debt Freedom System</div>
        </div>

        <div style={{padding:'12px 18px',borderBottom:'1px solid var(--b)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:'11px',color:'var(--t3)',fontFamily:'DM Mono,monospace'}}>
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
          <button
            onClick={toggleTheme}
            style={{background:'var(--s2)',border:'1px solid var(--b2)',borderRadius:'999px',padding:'5px 12px',fontSize:'13px',cursor:'pointer',color:'var(--text)',transition:'all .2s'}}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        <nav className="nav-links">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-item${pathname === link.href ? ' active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="nav-logout">
          <button onClick={handleLogout} className="btn-logout">
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}