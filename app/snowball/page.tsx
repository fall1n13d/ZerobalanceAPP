'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function SnowballPage() {
  const supabase = createClient()
  const [debts, setDebts] = useState<any[]>([])
  const [extraPayment, setExtraPayment] = useState('')
  const [method, setMethod] = useState('avalanche')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDebts()
  }, [])

  async function loadDebts() {
    const { data } = await supabase.from('debts').select('*')
    setDebts(data || [])
    setLoading(false)
  }

  function calculatePayoff() {
    let debtsCopy = debts.map((d) => ({
      ...d,
      balance: Number(d.balance),
      min_payment: Number(d.min_payment),
      apr: Number(d.apr),
    }))

    if (method === 'avalanche') {
      debtsCopy.sort((a, b) => b.apr - a.apr)
    } else {
      debtsCopy.sort((a, b) => a.balance - b.balance)
    }

    const extra = parseFloat(extraPayment) || 0
    let results: any[] = []
    let month = 0
    let totalInterest = 0

    while (debtsCopy.some((d) => d.balance > 0) && month < 600) {
      month++
      let extraLeft = extra

      for (let i = 0; i < debtsCopy.length; i++) {
        if (debtsCopy[i].balance <= 0) continue
        const interest = (debtsCopy[i].balance * (debtsCopy[i].apr / 100)) / 12
        totalInterest += interest
        debtsCopy[i].balance += interest
        debtsCopy[i].balance -= debtsCopy[i].min_payment
        if (debtsCopy[i].balance < 0) debtsCopy[i].balance = 0
      }

      for (let i = 0; i < debtsCopy.length; i++) {
        if (debtsCopy[i].balance <= 0) continue
        const payment = Math.min(extraLeft, debtsCopy[i].balance)
        debtsCopy[i].balance -= payment
        extraLeft -= payment
        break
      }

      results.push({
        month,
        balances: debtsCopy.map((d) => ({ name: d.name, balance: Math.max(0, d.balance) })),
      })
    }

    return { months: month, totalInterest, results }
  }

  const payoff = debts.length > 0 ? calculatePayoff() : null

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Snowball</h1>
        <a href="/dashboard" className="text-sm underline">Dashboard</a>
      </div>

      {loading ? <p>Loading...</p> : debts.length === 0 ? (
        <p>No debts found. <a href="/debts" className="underline">Add some debts first.</a></p>
      ) : (
        <div className="space-y-6">
          <div className="border rounded p-4 space-y-3">
            <h2 className="font-semibold">Settings</h2>
            <div>
              <label className="text-sm block mb-1">Payoff Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="border p-2 rounded w-full">
                <option value="avalanche">Avalanche (highest APR first)</option>
                <option value="snowball">Snowball (lowest balance first)</option>
              </select>
            </div>
            <div>
              <label className="text-sm block mb-1">Extra Monthly Payment</label>
              <input type="number" placeholder="0" value={extraPayment} onChange={(e) => setExtraPayment(e.target.value)} className="border p-2 rounded w-full" />
            </div>
          </div>

          {payoff && (
            <div className="border rounded p-4 space-y-3">
              <h2 className="font-semibold">Payoff Summary</h2>
              <p>Months to payoff: <strong>{payoff.months}</strong></p>
              <p>Years to payoff: <strong>{(payoff.months / 12).toFixed(1)}</strong></p>
              <p>Total interest paid: <strong>${payoff.totalInterest.toFixed(2)}</strong></p>
            </div>
          )}

          <div className="border rounded p-4 space-y-2">
            <h2 className="font-semibold">Payoff Order</h2>
            {[...debts]
              .sort((a, b) => method === 'avalanche' ? Number(b.apr) - Number(a.apr) : Number(a.balance) - Number(b.balance))
              .map((d, i) => (
                <div key={d.id} className="flex justify-between">
                  <span>{i + 1}. {d.name}</span>
                  <span>${Number(d.balance).toFixed(2)} @ {d.apr}%</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </main>
  )
}