'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, AtSign, CalendarClock, Check } from 'lucide-react'
import { markNotificationReadAction, markAllNotificationsReadAction } from '@/app/(app)/notifications-actions'
import { formatDateTime, formatDate } from '@/lib/utils'
import type { AppNotification } from '@/lib/types'

export interface UpcomingReminder {
  id: string
  label: string
  clientName: string | null
  deadline: string
  linkPath: string
  overdue: boolean
}

interface Props {
  notifications: AppNotification[]
  unreadCount: number
  upcoming: UpcomingReminder[]
  expanded: boolean
}

export default function NotificationBell({ notifications, unreadCount, upcoming, expanded }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, start] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function openNotification(n: AppNotification) {
    setOpen(false)
    start(async () => {
      if (!n.is_read) await markNotificationReadAction(n.id)
      router.push(n.link_path)
    })
  }

  function openReminder(r: UpcomingReminder) {
    setOpen(false)
    router.push(r.linkPath)
  }

  const totalBadge = unreadCount + upcoming.filter((u) => u.overdue).length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
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

      {open && (
        <div className="absolute left-full bottom-0 ml-2 z-50 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => start(async () => { await markAllNotificationsReadAction() })}
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
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => openNotification(n)}
                    className={`flex items-start gap-2.5 w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                  >
                    <AtSign className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
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
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
