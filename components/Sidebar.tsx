'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: '/debts', label: '💳 My Debts' },
    { href: '/budget', label: '💰 Budget' },
    { href: '/records', label: '📋 Records' },
    { href: '/snowball', label: '❄️ Snowball' },
  ]

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-name">Zero Balance</div>
        <div className="logo-sub">Debt Freedom System</div>
      </div>
      <nav className="nav-links">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-item${pathname === link.href ? ' active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="nav-logout">
        <button onClick={handleLogout} className="btn-logout">
          Sign Out
        </button>
      </div>
    </aside>
  )
}