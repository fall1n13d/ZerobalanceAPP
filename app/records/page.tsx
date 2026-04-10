'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function RecordsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [records, setRecords] = useState<any[]>([])
  const [month, setMonth] = useState('')
  const [totalDebt, setTotalDebt] = useState('')
  const [totalPaid, setTotalPaid] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecords()
  }, [])

  async function loadRecords() {
    const { data } = await supabase
      .from('records')
      .select('*')
      .order('created_at', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  async function addRecord(e: any) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    await supabase.from('records').insert({
      user_id: user.id,
      month,
      total_debt: parseFloat(totalDebt),
      total_paid: parseFloat(totalPaid),
      notes,
    })
    setMonth('')
    setTotalDebt('')
    setTotalPaid('')
    setNotes('')
    loadRecords()
  }

  async function deleteRecord(id: number) {
    await supabase.from('records').delete().eq('id', id)
    loadRecords()
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Records</h1>
        <a href="/dashboard" className="text-sm underline">Dashboard</a>
      </div>

      <form onSubmit={addRecord} className="border rounded p-4 space-y-3 mb-6">
        <h2 className="font-semibold">Add Monthly Record</h2>
        <input
          type="text"
          placeholder="Month (e.g. April 2026)"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          required
          className="border p-2 rounded w-full"
        />
        <input
          type="number"
          placeholder="Total debt"
          value={totalDebt}
          onChange={(e) => setTotalDebt(e.target.value)}
          required
          className="border p-2 rounded w-full"
        />
        <input
          type="number"
          placeholder="Total paid this month"
          value={totalPaid}
          onChange={(e) => setTotalPaid(e.target.value)}
          required
          className="border p-2 rounded w-full"
        />
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="border p-2 rounded w-full"
          rows={3}
        />
        <button type="submit" className="border px-4 py-2 rounded w-full font-semibold">
          Save Record
        </button>
      </form>

      {loading ? <p>Loading...</p> : records.length === 0 ? (
        <p>No records yet.</p>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="border rounded p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{r.month}</p>
                  <p className="text-sm">Total Debt: ${Number(r.total_debt).toFixed(2)}</p>
                  <p className="text-sm">Paid: ${Number(r.total_paid).toFixed(2)}</p>
                  {r.notes && <p className="text-sm text-gray-500 mt-1">{r.notes}</p>}
                </div>
                <button onClick={() => deleteRecord(r.id)} className="text-red-500 text-sm underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}