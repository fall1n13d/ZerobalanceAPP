'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function ForgotPassword() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleReset(e: any) {
    e.preventDefault()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://zerobalance-app.vercel.app/auth/callback',
    })

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Check your email for a reset link.')
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleReset} className="space-y-4 border p-6 rounded">
        <h1>Forgot Password</h1>
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 w-full"
        />
        {error && <p className="text-red-500">{error}</p>}
        {message && <p className="text-green-500">{message}</p>}
        <button type="submit" className="border px-4 py-2">
          Send Reset Link
        </button>
        <p className="text-sm">
          <a href="/login" className="underline">Back to login</a>
        </p>
      </form>
    </main>
  )
}