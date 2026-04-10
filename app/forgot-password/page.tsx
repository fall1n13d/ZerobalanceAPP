'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function ForgotPassword() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleReset(e: any) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://zerobalance-app.vercel.app/auth/callback',
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMessage('Check your email for a reset link.')
    setLoading(false)
  }

  return (
    <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{width:'100%',maxWidth:'420px'}}>
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'28px',color:'var(--green)',marginBottom:'6px'}}>Zero Balance</div>
          <div style={{fontSize:'12px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.08em'}}>Debt Freedom System</div>
        </div>

        <div style={{background:'var(--card-bg)',border:'1px solid var(--b2)',borderRadius:'24px',padding:'36px',boxShadow:'var(--shadow)'}}>
          <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'22px',marginBottom:'8px'}}>Reset Password</h1>
          <p style={{fontSize:'13px',color:'var(--t3)',marginBottom:'24px'}}>Enter your email and we will send you a reset link.</p>

          <form onSubmit={handleReset} style={{display:'flex',flexDirection:'column',gap:'16px'}}>
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

            {error && <p style={{fontSize:'12px',color:'var(--red)',fontFamily:'DM Mono,monospace'}}>{error}</p>}
            {message && <p style={{fontSize:'12px',color:'var(--green)',fontFamily:'DM Mono,monospace'}}>{message}</p>}

            <button type="submit" className="btn-add" style={{width:'100%',padding:'13px'}} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div style={{marginTop:'20px',textAlign:'center'}}>
            <Link href="/login" style={{fontSize:'12px',color:'var(--t3)',fontFamily:'DM Mono,monospace',textDecoration:'none'}}>
              Back to <span style={{color:'var(--green)'}}>Sign in</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}