'use client'

import { useState } from 'react'
import type { ActivityEntry } from '@/lib/types'
import { getInitials } from '@/lib/utils'
import { Activity, ChevronDown, ChevronUp } from 'lucide-react'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
]

function colorFor(name: string | null) {
  if (!name) return COLORS[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return COLORS[h % COLORS.length]
}

export default function ActivityLog({ entries }: { entries: ActivityEntry[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-sm text-gray-900">Activity</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium">
            {entries.length}
          </span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 max-h-80 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {entries.map((e) => (
                <div key={e.id} className="flex gap-3 px-5 py-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${colorFor(e.user_name)}`}>
                    {getInitials(e.user_name ?? '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">
                      <span className="font-medium text-gray-900">{e.user_name ?? 'Someone'}</span>
                      {' '}{e.action}
                      {e.detail && (
                        <span className="text-gray-500"> — <em className="not-italic text-gray-600">{e.detail}</em></span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(e.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
