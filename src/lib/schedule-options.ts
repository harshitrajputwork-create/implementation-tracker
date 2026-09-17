function fmt(minutes: number, dir: 'ahead' | 'behind') {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  return `${parts.join(' ')} ${dir} of IST`
}

// Practical range covering real-world offsets from IST (UTC+5:30): roughly
// UTC-8 (US Pacific, ~13h30 behind) through UTC+11 (Sydney DST, ~5h30 ahead).
export const TZ_AHEAD_OPTIONS = Array.from({ length: 12 }, (_, i) => fmt((i + 1) * 30, 'ahead'))
export const TZ_BEHIND_OPTIONS = Array.from({ length: 28 }, (_, i) => fmt((i + 1) * 30, 'behind'))
export const TZ_SAME_AS_IST = 'Same as IST'

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export function parseWeeklyOffs(value: string | null): string[] {
  if (!value) return []
  return value.split(',').map((d) => d.trim()).filter(Boolean)
}
