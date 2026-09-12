'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { cn, getInitials } from '@/lib/utils'
import { CHANGELOG } from '@/lib/changelog'
import {
  LayoutDashboard, Plus, LogOut, ClipboardList,
  Users, BookOpen, Sparkles, ChevronDown, ChevronUp,
  PanelLeftClose, PanelLeftOpen, Settings,
} from 'lucide-react'

interface SidebarProps { user: Profile }

const recentCount = CHANGELOG.filter((e) => {
  const d = new Date(e.date)
  const now = new Date()
  return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
}).length

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [pinned, setPinned]         = useState(false)
  const [hovered, setHovered]       = useState(false)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)

  // Load pin preference from localStorage after mount
  useEffect(() => {
    setPinned(localStorage.getItem('sidebar_pinned') === 'true')
  }, [])

  const expanded = pinned || hovered

  function togglePin() {
    const next = !pinned
    setPinned(next)
    localStorage.setItem('sidebar_pinned', String(next))
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { href: '/dashboard',   label: 'Dashboard',     icon: LayoutDashboard },
    { href: '/clients/new', label: 'New Client',    icon: Plus,     hideFor: ['visitor'] as const },
    { href: '/team',        label: 'Team',          icon: Users,    showFor: ['admin'] as const },
    { href: '/library',     label: 'Use Cases',     icon: BookOpen, showFor: ['admin'] as const },
    { href: '/config',      label: 'Configuration', icon: Settings, showFor: ['admin'] as const },
  ]

  return (
    <div
      className={cn(
        'flex-shrink-0 bg-slate-900 flex flex-col h-full border-r border-slate-800 transition-all duration-200 overflow-hidden',
        expanded ? 'w-60' : 'w-[52px]',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Brand */}
      <div className={cn('py-5 border-b border-slate-800 flex-shrink-0', expanded ? 'px-5' : 'px-[10px]')}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          {expanded && (
            <div className="min-w-0 overflow-hidden">
              <p className="text-white font-semibold text-sm leading-tight whitespace-nowrap">Impl. Tracker</p>
              <p className="text-slate-400 text-xs">Taqtics</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 py-4 space-y-0.5 overflow-y-auto', expanded ? 'px-3' : 'px-2')}>
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
              title={!expanded ? label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                expanded ? 'px-3 py-2.5' : 'px-2 py-2.5 justify-center',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {expanded && <span className="whitespace-nowrap overflow-hidden">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* What's New */}
      <div className={cn('border-t border-slate-800 pt-2 flex-shrink-0', expanded ? 'px-3 pb-2' : 'px-2 pb-2')}>
        {expanded ? (
          <>
            <button
              onClick={() => setWhatsNewOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors text-sm"
            >
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left font-medium whitespace-nowrap">What&apos;s New</span>
              {recentCount > 0 && (
                <span className="text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5 font-semibold leading-none">
                  {recentCount}
                </span>
              )}
              {whatsNewOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
                <Link href="/changelog" className="block text-xs text-blue-400 hover:text-blue-300 mt-1">
                  See full changelog →
                </Link>
              </div>
            )}
          </>
        ) : (
          <button
            title="What's New"
            className="relative flex items-center justify-center w-full py-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {recentCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </button>
        )}
      </div>

      {/* Pin toggle */}
      <div className={cn('border-t border-slate-800 pt-1 pb-1 flex-shrink-0', expanded ? 'px-3' : 'px-2')}>
        <button
          onClick={togglePin}
          title={pinned ? 'Collapse sidebar' : 'Keep sidebar open'}
          className={cn(
            'flex items-center gap-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors py-2',
            expanded ? 'px-3 w-full' : 'px-2 justify-center w-full',
          )}
        >
          {pinned
            ? <PanelLeftClose className="w-4 h-4 flex-shrink-0" />
            : <PanelLeftOpen className="w-4 h-4 flex-shrink-0" />}
          {expanded && (
            <span className="text-xs whitespace-nowrap">{pinned ? 'Collapse' : 'Pin open'}</span>
          )}
        </button>
      </div>

      {/* User + sign out */}
      <div className={cn('border-t border-slate-800 py-4 flex-shrink-0', expanded ? 'px-3' : 'px-2')}>
        {expanded ? (
          <>
            <div className="flex items-center gap-3 px-3 py-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {getInitials(user.full_name ?? user.email)}
              </div>
              <div className="min-w-0 overflow-hidden">
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
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold"
              title={user.full_name ?? user.email}
            >
              {getInitials(user.full_name ?? user.email)}
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              className="flex items-center justify-center py-1.5 w-full rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
