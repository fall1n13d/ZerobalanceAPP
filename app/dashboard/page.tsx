'use client'

import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

export default function Dashboard() {
  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <div className="page-title">Dashboard</div>
          <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'8px'}}>Welcome back</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'16px'}}>
          <Link href="/debts" style={{textDecoration:'none'}}>
            <div className="metric-card">
              <div className="metric-label">My Debts</div>
              <div className="metric-value red">View →</div>
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
              <div className="metric-value" style={{color:'var(--purple)'}}>View →</div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}