'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleUpdate(e: any) {
    e.preventDefault()

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Password updated! Redirecting to login...')
    setTimeout(() => router.push('/login'), 2000)
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleUpdate} className="space-y-4 border p-6 rounded">
        <h1>Set New Password</h1>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 w-full"
        />

        {error && <p className="text-red-500">{error}</p>}
        {message && <p className="text-green-500">{message}</p>}

        <button type="submit" className="border px-4 py-2">
          Update Password
        </button>
      </form>
    </main>
  )
}