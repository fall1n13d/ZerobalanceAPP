export default function Dashboard() {
  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Zero Balance</h1>
      <div className="space-y-3">
        <a href="/debts" className="block border rounded p-4 font-semibold hover:bg-gray-50">
          My Debts
        </a>
        <a href="/budget" className="block border rounded p-4 font-semibold hover:bg-gray-50">
          Budget
        </a>
        <a href="/records" className="block border rounded p-4 font-semibold hover:bg-gray-50">
          Records
        </a>
        <a href="/snowball" className="block border rounded p-4 font-semibold hover:bg-gray-50">
          Snowball
        </a>
      </div>
      <div className="mt-6">
        <a href="/login" className="text-sm underline">Log out</a>
      </div>
    </main>
  )
}