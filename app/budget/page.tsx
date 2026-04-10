'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function BudgetPage() {
  const supabase = createClient()
  const router = useRouter()
  const [income, setIncome] = useState<any[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [incomeName, setIncomeName] = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [billName, setBillName] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: incomeData } = await supabase.from('income').select('*').order('created_at', { ascending: true })
    const { data: billsData } = await supabase.from('bills').select('*').order('created_at', { ascending: true })
    setIncome(incomeData || [])
    setBills(billsData || [])
    setLoading(false)
  }

  async function addIncome(e: any) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    await supabase.from('income').insert({ user_id: user.id, name: incomeName, amount: parseFloat(incomeAmount) })
    setIncomeName('')
    setIncomeAmount('')
    loadData()
  }

  async function addBill(e: any) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    await supabase.from('bills').insert({ user_id: user.id, name: billName, amount: parseFloat(billAmount) })
    setBillName('')
    setBillAmount('')
    loadData()
  }

  async function deleteIncome(id: number) {
    await supabase.from('income').delete().eq('id', id)
    loadData()
  }

  async function deleteBill(id: number) {
    await supabase.from('bills').delete().eq('id', id)
    loadData()
  }

  const totalIncome = income.reduce((sum, i) => sum + Number(i.amount), 0)
  const totalBills = bills.reduce((sum, b) => sum + Number(b.amount), 0)
  const leftover = totalIncome - totalBills

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Budget</h1>
        <a href="/dashboard" className="text-sm underline">Dashboard</a>
      </div>
      {loading ? <p>Loading...</p> : (
        <div className="space-y-6">
          <div className="border rounded p-4 space-y-3">
            <h2 className="font-semibold">Income</h2>
            <form onSubmit={addIncome} className="flex gap-2">
              <input type="text" placeholder="Name" value={incomeName} onChange={(e) => setIncomeName(e.target.value)} required className="border p-2 rounded flex-1" />
              <input type="number" placeholder="Amount" value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} required className="border p-2 rounded w-32" />
              <button type="submit" className="border px-3 py-2 rounded font-semibold">Add</button>
            </form>
            {income.map((i) => (
              <div key={i.id} className="flex justify-between items-center">
                <span>{i.name}</span>
                <div className="flex gap-3 items-center">
                  <span>${Number(i.amount).toFixed(2)}</span>
                  <button onClick={() => deleteIncome(i.id)} className="text-red-500 text-sm underline">Delete</button>
                </div>
              </div>
            ))}
            <p className="font-semibold">Total Income: ${totalIncome.toFixed(2)}</p>
          </div>
          <div className="border rounded p-4 space-y-3">
            <h2 className="font-semibold">Bills</h2>
            <form onSubmit={addBill} className="flex gap-2">
              <input type="text" placeholder="Name" value={billName} onChange={(e) => setBillName(e.target.value)} required className="border p-2 rounded flex-1" />
              <input type="number" placeholder="Amount" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} required className="border p-2 rounded w-32" />
              <button type="submit" className="border px-3 py-2 rounded font-semibold">Add</button>
            </form>
            {bills.map((b) => (
              <div key={b.id} className="flex justify-between items-center">
                <span>{b.name}</span>
                <div className="flex gap-3 items-center">
                  <span>${Number(b.amount).toFixed(2)}</span>
                  <button onClick={() => deleteBill(b.id)} className="text-red-500 text-sm underline">Delete</button>
                </div>
              </div>
            ))}
            <p className="font-semibold">Total Bills: ${totalBills.toFixed(2)}</p>
          </div>
          <div className="border rounded p-4">
            <p className="font-semibold">Leftover: ${leftover.toFixed(2)}</p>
          </div>
        </div>
      )}
    </main>
  )
}