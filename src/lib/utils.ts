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

export function computeAutoStatus(
  kickoffDate: string | null,
  steps: Array<{ status: string; ideated_day_range: string }>,
): ClientStatus {
  if (!kickoffDate || steps.length === 0) return 'on_track'

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

  if (maxOverdue > 5) return 'blocked_on_client'
  if (maxOverdue > 0) return 'at_risk'
  return 'on_track'
}

export function effectiveStatus(
  isHandedOver: boolean,
  statusOverride: ClientStatus | null,
  kickoffDate: string | null,
  steps: Array<{ status: string; ideated_day_range: string }>,
): { status: ClientStatus; isAuto: boolean } {
  if (isHandedOver) return { status: 'handed_over', isAuto: false }
  if (statusOverride) return { status: statusOverride, isAuto: false }
  return { status: computeAutoStatus(kickoffDate, steps), isAuto: true }
}
