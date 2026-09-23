'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, AtSign, CalendarClock, Check } from 'lucide-react'
import {
  markNotificationReadAction, markAllNotificationsReadAction, getNotificationsDataAction,
} from '@/app/(app)/notifications-actions'
import { formatDateTime, formatDate } from '@/lib/utils'
import type { AppNotification, UpcomingReminder } from '@/lib/types'

interface Props {
  expanded: boolean
}

const POLL_MS = 60_000

export default function NotificationBell({ expanded }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [upcoming, setUpcoming] = useState<UpcomingReminder[]>([])
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null)
  const [isPending, start] = useTransition()
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  async function load() {
    const data = await getNotificationsDataAction()
    setNotifications(data.notifications)
    setUnreadCount(data.unreadCount)
    setUpcoming(data.upcoming)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresh whenever the route changes — cheap, catches anything created elsewhere.
  useEffect(() => { load() }, [pathname])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function toggleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPanelPos({ top: Math.min(rect.bottom, window.innerHeight - 420), left: rect.right + 8 })
    }
    setOpen((v) => !v)
  }

  function openNotification(n: AppNotification) {
    setOpen(false)
    if (!n.is_read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
      setUnreadCount((c) => Math.max(0, c - 1))
      start(async () => { await markNotificationReadAction(n.id) })
    }
    router.push(n.link_path)
  }

  function openReminder(r: UpcomingReminder) {
    setOpen(false)
    router.push(r.linkPath)
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    start(async () => { await markAllNotificationsReadAction() })
  }

  const totalBadge = unreadCount + upcoming.filter((u) => u.overdue).length

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggleOpen}
        title="Notifications"
        className={`relative flex items-center gap-3 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors ${
          expanded ? 'px-3 py-2 w-full' : 'px-2 py-2 justify-center w-full'
        }`}
      >
        <Bell className="w-4 h-4 flex-shrink-0" />
        {expanded && <span className="text-sm font-medium flex-1 text-left">Notifications</span>}
        {totalBadge > 0 && expanded && (
          <span className="text-xs bg-red-600 text-white rounded-full px-1.5 py-0.5 font-semibold leading-none">
            {totalBadge}
          </span>
        )}
        {totalBadge > 0 && !expanded && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {open && panelPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: panelPos.top, left: panelPos.left }}
          className="z-[100] w-80 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={isPending}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {upcoming.length > 0 && (
              <div className="border-b border-gray-100">
                <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Upcoming deadlines</p>
                {upcoming.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => openReminder(r)}
                    className="flex items-start gap-2.5 w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <CalendarClock className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${r.overdue ? 'text-red-500' : 'text-amber-500'}`} />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700 truncate">{r.label}</p>
                      <p className={`text-[11px] mt-0.5 ${r.overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {r.clientName ? `${r.clientName} · ` : ''}{r.overdue ? 'Overdue' : 'Due'} {formatDate(r.deadline)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {notifications.length === 0 && upcoming.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">You&apos;re all caught up.</p>
            )}

            {notifications.length > 0 && (
              <div>
                {upcoming.length > 0 && (
                  <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Mentions</p>
                )}
                {notifications.map((n) => {
                  const isTrialNotif = !!n.trial_account_id
                  return (
                  <button
                    key={n.id}
                    onClick={() => openNotification(n)}
                    className={`flex items-start gap-2.5 w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors border-l-2 ${
                      isTrialNotif ? 'border-l-purple-400' : 'border-l-blue-400'
                    } ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                  >
                    <AtSign className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isTrialNotif ? 'text-purple-500' : 'text-blue-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-700">
                        <span className="font-semibold">{n.actor_name ?? 'Someone'}</span> mentioned you
                        {n.client_name && <> in <span className="font-medium">{n.client_name}</span></>}
                      </p>
                      {n.preview && <p className="text-xs text-gray-500 truncate mt-0.5">{n.preview}</p>}
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0 mt-1.5" />}
                  </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
