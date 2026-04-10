'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: any) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{width:'100%',maxWidth:'420px'}}>
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'28px',color:'var(--green)',marginBottom:'6px'}}>Zero Balance</div>
          <div style={{fontSize:'12px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.08em'}}>Debt Freedom System</div>
        </div>

        <div style={{background:'var(--card-bg)',border:'1px solid var(--b2)',borderRadius:'24px',padding:'36px',boxShadow:'var(--shadow)'}}>
          <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'22px',marginBottom:'24px'}}>Sign In</h1>

          <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            <div>
              <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'6px'}}>Email</div>
              <input
                className="fi"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <div style={{fontSize:'10px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'6px'}}>Password</div>
              <input
                className="fi"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p style={{fontSize:'12px',color:'var(--red)',fontFamily:'DM Mono,monospace'}}>{error}</p>}

            <button type="submit" className="btn-add" style={{width:'100%',padding:'13px'}} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{marginTop:'20px',display:'flex',flexDirection:'column',gap:'10px',textAlign:'center'}}>
            <Link href="/signup" style={{fontSize:'12px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textDecoration:'none'}}>
              Need an account? <span style={{color:'var(--green)'}}>Sign up</span>
            </Link>
            <Link href="/forgot-password" style={{fontSize:'12px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textDecoration:'none'}}>
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}