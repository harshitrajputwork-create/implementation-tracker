'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { cn, getInitials } from '@/lib/utils'
import { CHANGELOG } from '@/lib/changelog'
import NotificationBell from './NotificationBell'
import {
  LayoutDashboard, Plus, LogOut, ClipboardList,
  BookOpen, Sparkles, ChevronDown,
  PanelLeftClose, PanelLeftOpen, Settings, ChevronRight, NotebookPen,
} from 'lucide-react'

interface SidebarClient { id: string; name: string; status: string }
interface SidebarProps {
  user: Profile
  clients: SidebarClient[]
}

const STATUS_DOT: Record<string, string> = {
  on_track:  'bg-green-400',
  at_risk:   'bg-amber-400',
  delayed:   'bg-red-400',
  completed: 'bg-blue-400',
}

const recentCount = CHANGELOG.filter((e) => {
  const d = new Date(e.date)
  return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
}).length

export default function Sidebar({ user, clients }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [pinned, setPinned]           = useState(false)
  const [hovered, setHovered]         = useState(false)
  const [clientsOpen, setClientsOpen] = useState(true)

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

  const isAdmin = user.role === 'admin'

  function NavLink({ href, label, icon: Icon, badge }: {
    href: string; label: string; icon: React.ElementType; badge?: number
  }) {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
    return (
      <Link
        href={href}
        title={!expanded ? label : undefined}
        className={cn(
          'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors relative',
          expanded ? 'px-3 py-2.5' : 'px-2 py-2.5 justify-center',
          isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {expanded && <span className="whitespace-nowrap overflow-hidden flex-1">{label}</span>}
        {badge !== undefined && badge > 0 && expanded && (
          <span className="text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5 font-semibold leading-none">
            {badge}
          </span>
        )}
        {badge !== undefined && badge > 0 && !expanded && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full" />
        )}
      </Link>
    )
  }

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

      {/* Main nav + client list — scrollable */}
      <nav className={cn('flex-1 py-3 flex flex-col overflow-hidden', expanded ? 'px-3' : 'px-2')}>
        {/* Top links */}
        <div className="space-y-0.5 flex-shrink-0">
          <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} />
          {user.role !== 'visitor' && (
            <NavLink href="/clients/new" label="New Client" icon={Plus} />
          )}
        </div>

        {/* Client list */}
        {clients.length > 0 && (
          <div className="mt-3 flex-1 min-h-0 flex flex-col">
            {expanded ? (
              <>
                <button
                  onClick={() => setClientsOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-1 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors w-full mb-1"
                >
                  {clientsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  Clients
                  <span className="ml-auto text-slate-600 font-normal normal-case tracking-normal">
                    {clients.length}
                  </span>
                </button>
                {clientsOpen && (
                  <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
                    {clients.map((c) => {
                      const isActive = pathname.startsWith(`/clients/${c.id}`)
                      return (
                        <Link
                          key={c.id}
                          href={`/clients/${c.id}`}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT[c.status] ?? 'bg-slate-500')} />
                          <span className="truncate">{c.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              /* Collapsed: show first few status dots as hint */
              <div className="flex flex-col items-center gap-1 mt-1">
                {clients.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    href={`/clients/${c.id}`}
                    title={c.name}
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-800',
                      pathname.startsWith(`/clients/${c.id}`) ? 'bg-slate-700' : '',
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', STATUS_DOT[c.status] ?? 'bg-slate-500')} />
                  </Link>
                ))}
                {clients.length > 5 && (
                  <span className="text-[10px] text-slate-600">+{clients.length - 5}</span>
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Sticky tools — Planner + Notifications, top of the bottom panel, for everyone */}
      <div className={cn('border-t border-slate-800 py-2 flex-shrink-0 space-y-0.5', expanded ? 'px-3' : 'px-2')}>
        <NavLink href="/planner" label="Planner" icon={NotebookPen} />
        <NotificationBell expanded={expanded} />
      </div>

      {/* Admin links */}
      {isAdmin && (
        <div className={cn('border-t border-slate-800 py-2 flex-shrink-0 space-y-0.5', expanded ? 'px-3' : 'px-2')}>
          {[
            { href: '/library',  label: 'Use Cases', icon: BookOpen },
            { href: '/settings', label: 'Settings',  icon: Settings },
          ].map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                title={!expanded ? label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                  expanded ? 'px-3 py-2' : 'px-2 py-2 justify-center',
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {expanded && <span className="whitespace-nowrap overflow-hidden">{label}</span>}
              </Link>
            )
          })}
        </div>
      )}

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
              <div className="min-w-0 overflow-hidden flex-1">
                <p className="text-white text-sm font-medium truncate">
                  {user.full_name ?? user.email.split('@')[0]}
                </p>
                <p className="text-slate-500 text-xs capitalize">{user.role}</p>
              </div>
              <Link
                href="/changelog"
                title="What's new"
                className="relative p-1.5 text-slate-500 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {recentCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full" />
                )}
              </Link>
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
              className="relative w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold"
              title={user.full_name ?? user.email}
            >
              {getInitials(user.full_name ?? user.email)}
            </div>
            <Link
              href="/changelog"
              title="What's new"
              className="relative flex items-center justify-center py-1 w-full rounded-lg text-slate-500 hover:text-amber-300 hover:bg-slate-800 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {recentCount > 0 && (
                <span className="absolute top-0.5 right-2.5 w-1.5 h-1.5 bg-amber-400 rounded-full" />
              )}
            </Link>
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
