import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import type { ClientStatus } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, h:mm a')
  } catch {
    return dateStr
  }
}

export function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  try {
    return differenceInCalendarDays(new Date(), parseISO(dateStr))
  } catch {
    return null
  }
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

// "https://angadi.taqtics.co/" -> "angadi" — the account's subdomain, used
// as a readable label instead of a generic "Open trial" link.
export function subdomainOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const host = new URL(url).hostname
    return host.split('.')[0] || null
  } catch {
    return null
  }
}

// Standard demo-login temp password convention: capitalized subdomain +
// "@123789" — e.g. subdomain "impl3" -> "Impl3@123789".
export function defaultDemoPassword(trialUrl: string | null | undefined): string {
  const sub = subdomainOf(trialUrl)
  if (!sub) return ''
  return `${sub.charAt(0).toUpperCase()}${sub.slice(1)}@123789`
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

// Client-side only — builds a CSV blob and triggers a browser download.
export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── auto at-risk status ───────────────────────────────────────────────────────

function parseDayRange(range: string): { startDay: number; endDay: number } {
  const clean = range.replace(/D/g, '').replace('–', '-').replace('—', '-')
  if (clean.includes('-')) {
    const parts = clean.split('-').map((s) => parseInt(s.trim()))
    return { startDay: parts[0], endDay: parts[1] }
  }
  const day = parseInt(clean)
  return { startDay: day, endDay: day }
}

export function computeOverdueDays(
  kickoffDate: string | null,
  steps: Array<{ status: string; ideated_day_range: string }>,
): number {
  if (!kickoffDate || steps.length === 0) return 0

  // An early step that's further along (lower day-range) than the latest
  // *done* step is almost always just an un-ticked checkbox, not a real
  // blocker — e.g. "Kickoff" (D1) never got marked done, but step 6 (D16)
  // already is, so Kickoff obviously happened. Only steps beyond the
  // furthest progress actually made count toward overdue, so stale early
  // steps can't single-handedly flip the whole account to Blocked.
  const maxDoneEndDay = steps.reduce((max, s) => {
    if (s.status !== 'done') return max
    return Math.max(max, parseDayRange(s.ideated_day_range).endDay)
  }, 0)

  let maxOverdue = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const step of steps) {
    if (step.status === 'done') continue
    const { endDay } = parseDayRange(step.ideated_day_range)
    if (endDay <= maxDoneEndDay) continue
    const idealEnd = new Date(kickoffDate)
    idealEnd.setDate(idealEnd.getDate() + endDay - 1)
    const overdue = differenceInCalendarDays(today, idealEnd)
    if (overdue > maxOverdue) maxOverdue = overdue
  }

  return maxOverdue
}

export function computeAutoStatus(
  kickoffDate: string | null,
  steps: Array<{ status: string; ideated_day_range: string }>,
): ClientStatus {
  const maxOverdue = computeOverdueDays(kickoffDate, steps)
  if (maxOverdue > 5) return 'blocked_on_client'
  if (maxOverdue > 0) return 'at_risk'
  return 'on_track'
}

export function effectiveStatus(
  isHandedOver: boolean,
  statusOverride: ClientStatus | null,
  kickoffDate: string | null,
  steps: Array<{ status: string; ideated_day_range: string }>,
): { status: ClientStatus; isAuto: boolean; overdueDays: number } {
  const overdueDays = computeOverdueDays(kickoffDate, steps)
  if (isHandedOver) return { status: 'handed_over', isAuto: false, overdueDays }
  if (statusOverride) return { status: statusOverride, isAuto: false, overdueDays }
  return { status: computeAutoStatus(kickoffDate, steps), isAuto: true, overdueDays }
}

export function formatOverdue(days: number): string {
  if (days <= 0) return ''
  if (days < 30) return `${days}d overdue`
  const months = Math.floor(days / 30)
  const rem = days % 30
  return rem === 0 ? `${months}mo overdue` : `${months}mo ${rem}d overdue`
}
