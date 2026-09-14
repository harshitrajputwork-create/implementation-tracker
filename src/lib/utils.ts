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

  let maxOverdue = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const step of steps) {
    if (step.status === 'done') continue
    const { endDay } = parseDayRange(step.ideated_day_range)
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
