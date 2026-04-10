'use client'

import Link from 'next/link'

export default function Dashboard() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-name">Zero Balance</div>
          <div className="logo-sub">Debt Freedom System</div>
        </div>
        <nav className="nav-links">
          <Link href="/debts" className="nav-item">💳 My Debts</Link>
          <Link href="/budget" className="nav-item">💰 Budget</Link>
          <Link href="/records" className="nav-item">📋 Records</Link>
          <Link href="/snowball" className="nav-item">❄️ Snowball</Link>
        </nav>
        <div className="nav-logout">
          <Link href="/login" className="btn-logout" style={{display:'block',textAlign:'center',textDecoration:'none'}}>Sign Out</Link>
        </div>
      </aside>
      <main className="main">
        <div className="page-header">
          <div className="page-title">Dashboard</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'16px'}}>
          <Link href="/debts" style={{textDecoration:'none'}}>
            <div className="metric-card">
              <div className="metric-label">My Debts</div>
              <div className="metric-value green">View →</div>
            </div>
          </Link>
          <Link href="/budget" style={{textDecoration:'none'}}>
            <div className="metric-card">
              <div className="metric-label">Budget</div>
              <div className="metric-value amber">View →</div>
            </div>
          </Link>
          <Link href="/records" style={{textDecoration:'none'}}>
            <div className="metric-card">
              <div className="metric-label">Records</div>
              <div className="metric-value" style={{color:'var(--blue)'}}>View →</div>
            </div>
          </Link>
          <Link href="/snowball" style={{textDecoration:'none'}}>
            <div className="metric-card">
              <div className="metric-label">Snowball</div>
              <div className="metric-value" style={{color:'var(--purple,#c084fc)'}}>View →</div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}