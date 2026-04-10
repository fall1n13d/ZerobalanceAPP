import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{width:'100%',maxWidth:'580px',textAlign:'center'}}>

        <div style={{marginBottom:'48px'}}>
          <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'48px',color:'var(--green)',letterSpacing:'-2px',marginBottom:'8px'}}>
            Zero Balance
          </div>
          <div style={{fontSize:'12px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:'24px'}}>
            Debt Freedom System
          </div>
          <p style={{fontSize:'16px',color:'var(--t2)',lineHeight:1.7,maxWidth:'440px',margin:'0 auto'}}>
            Track your debts, manage your budget, and calculate your fastest path to financial freedom.
          </p>
        </div>

        <div style={{display:'flex',gap:'12px',justifyContent:'center',marginBottom:'48px'}}>
          <Link href="/signup" style={{textDecoration:'none'}}>
            <button className="btn-add" style={{padding:'14px 32px',fontSize:'15px'}}>
              Get Started Free
            </button>
          </Link>
          <Link href="/login" style={{textDecoration:'none'}}>
            <button style={{background:'transparent',border:'1px solid var(--b2)',borderRadius:'12px',color:'var(--t2)',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'15px',padding:'14px 32px',cursor:'pointer',transition:'all .15s'}}>
              Sign In
            </button>
          </Link>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'14px',marginBottom:'48px'}}>
          <div className="metric-card" style={{textAlign:'left'}}>
            <div style={{fontSize:'24px',marginBottom:'8px'}}>💳</div>
            <div className="metric-label">Debt Tracking</div>
            <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'4px'}}>Track all your debts in one place</div>
          </div>
          <div className="metric-card" style={{textAlign:'left'}}>
            <div style={{fontSize:'24px',marginBottom:'8px'}}>💰</div>
            <div className="metric-label">Budget Manager</div>
            <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'4px'}}>Track income, bills and leftover</div>
          </div>
          <div className="metric-card" style={{textAlign:'left'}}>
            <div style={{fontSize:'24px',marginBottom:'8px'}}>❄️</div>
            <div className="metric-label">Snowball Calculator</div>
            <div style={{fontSize:'13px',color:'var(--t3)',marginTop:'4px'}}>Find your fastest payoff path</div>
          </div>
        </div>

        <div style={{fontSize:'11px',color:'var(--t3)',fontFamily:'DM Mono,monospace'}}>
          Free to use · No credit card required · Your data stays private
        </div>

      </div>
    </main>
  )
}