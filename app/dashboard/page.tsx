export default function Dashboard() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="border p-6 rounded space-y-4">
        <h1 className="text-2xl font-bold">Welcome to Zero Balance</h1>
        <p>You are logged in!</p>
        <a href="/login" className="underline text-sm">Log out</a>
      </div>
    </main>
  )
}