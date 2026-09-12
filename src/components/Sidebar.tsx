'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { cn, getInitials } from '@/lib/utils'
import { CHANGELOG } from '@/lib/changelog'
import {
  LayoutDashboard, Plus, LogOut, ClipboardList,
  Users, BookOpen, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  user: Profile
}

const recentCount = CHANGELOG.filter((e) => {
  const d = new Date(e.date)
  const now = new Date()
  return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
}).length

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { href: '/dashboard',   label: 'Dashboard',  icon: LayoutDashboard },
    { href: '/clients/new', label: 'New Client',  icon: Plus,      hideFor: ['visitor'] as const },
    { href: '/team',        label: 'Team',        icon: Users,     showFor: ['admin'] as const },
    { href: '/library',     label: 'Use Cases',   icon: BookOpen,  showFor: ['admin'] as const },
  ]

  return (
    <div className="w-60 flex-shrink-0 bg-slate-900 flex flex-col h-full border-r border-slate-800">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">Impl. Tracker</p>
            <p className="text-slate-400 text-xs">Taqtics</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, hideFor, showFor }) => {
          if (hideFor?.includes(user.role as never)) return null
          if (showFor && !showFor.includes(user.role as never)) return null
          const isActive =
            pathname === href ||
            (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* What's New */}
      <div className="px-3 pb-2 border-t border-slate-800 pt-3">
        <button
          onClick={() => setWhatsNewOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors text-sm"
        >
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left font-medium">What&apos;s New</span>
          {recentCount > 0 && (
            <span className="text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5 font-semibold leading-none">
              {recentCount}
            </span>
          )}
          {whatsNewOpen ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {whatsNewOpen && (
          <div className="mt-1 px-3 pb-2 space-y-2">
            {CHANGELOG.slice(0, 2).map((entry) => (
              <div key={entry.version}>
                <p className="text-xs font-semibold text-slate-300 mb-1">
                  {entry.version} · {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
                <ul className="space-y-0.5">
                  {entry.changes.slice(0, 3).map((c, i) => (
                    <li key={i} className="text-xs text-slate-500 leading-snug">· {c}</li>
                  ))}
                </ul>
              </div>
            ))}
            <Link
              href="/changelog"
              className="block text-xs text-blue-400 hover:text-blue-300 mt-1"
            >
              See full changelog →
            </Link>
          </div>
        )}
      </div>

      {/* User + sign out */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(user.full_name ?? user.email)}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user.full_name ?? user.email.split('@')[0]}
            </p>
            <p className="text-slate-500 text-xs capitalize">{user.role}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 text-slate-400 hover:text-slate-100 text-sm w-full px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  )
}
