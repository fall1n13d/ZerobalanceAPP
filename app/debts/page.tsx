'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function DebtsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [debts, setDebts] = useState<any[]>([])
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [minPayment, setMinPayment] = useState('')
  const [apr, setApr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDebts()
  }, [])

  async function loadDebts() {
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) console.error(error)
    else setDebts(data || [])
    setLoading(false)
  }

  async function addDebt(e: any) {
    e.preventDefault()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { error } = await supabase.from('debts').insert({
      user_id: user.id,
      name,
      balance: parseFloat(balance),
      min_payment: parseFloat(minPayment),
      apr: parseFloat(apr),
    })

    if (error) {
      console.error(error)
      return
    }

    setName('')
    setBalance('')
    setMinPayment('')
    setApr('')
    loadDebts()
  }

  async function deleteDebt(id: number) {
    await supabase.from('debts').delete().eq('id', id)
    loadDebts()
  }

  const totalBalance = debts.reduce((sum, d) => sum + Number(d.balance), 0)
  const totalMinPayment = debts.reduce((sum, d) => sum + Number(d.min_payment), 0)

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Debts</h1>
        <a href="/dashboard" className="text-sm underline">Dashboard</a>
      </div>

      <form onSubmit={addDebt} className="border rounded p-4 space-y-3 mb-6">
        <h2 className="font-semibold">Add Debt</h2>
        <input
          type="text"
          placeholder="Debt name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="border p-2 w-full rounded"
        />
        <input
          type="number"
          placeholder="Balance"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          required
          className="border p-2 w-full rounded"
        />
        <input
          type="number"
          placeholder="Min payment"
          value={minPayment}
          onChange={(e) => setMinPayment(e.target.value)}
          required
          className="border p-2 w-full rounded"
        />
        <input
          type="number"
          placeholder="APR %"
          value={apr}
          onChange={(e) => setApr(e.target.value)}
          required
          className="border p-2 w-full rounded"
        />
        <button type="submit" className="border px-4 py-2 rounded w-full font-semibold">
          Add Debt
        </button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : debts.length === 0 ? (
        <p className="text-gray-500">No debts added yet.</p>
      ) : (
        <div className="space-y-3">
          {debts.map((debt) => (
            <div key={debt.id} className="border rounded p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{debt.name}</p>
                <p className="text-sm">Balance: ${Number(debt.balance).toFixed(2)}</p>
                <p className="text-sm">Min Payment: ${Number(debt.min_payment).toFixed(2)}</p>
                <p className="text-sm">APR: {debt.apr}%</p>
              </div>
              <button
                onClick={() => deleteDebt(debt.id)}
                classNam