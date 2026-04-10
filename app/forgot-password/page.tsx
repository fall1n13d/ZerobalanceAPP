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
    <main className="flex min-h-screen items-center justify-cente