import { cn, formatOverdue } from '@/lib/utils'
import type { ClientStatus } from '@/lib/types'

const statusConfig: Record<ClientStatus, { label: string; classes: string }> = {
  on_track: {
    label: 'On Track',
    classes: 'bg-green-50 text-green-700 border-green-200',
  },
  at_risk: {
    label: 'At Risk',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  blocked_on_client: {
    label: 'Blocked on Client',
    classes: 'bg-red-50 text-red-700 border-red-200',
  },
  handed_over: {
    label: 'Handed Over',
    classes: 'bg-violet-50 text-violet-700 border-violet-200',
  },
}

export default function StatusBadge({
  status,
  size = 'md',
  overdueDays,
}: {
  status: ClientStatus
  size?: 'sm' | 'md'
  overdueDays?: number
}) {
  const cfg = statusConfig[status]
  const showOverdue =
    overdueDays != null && overdueDays > 0 && (status === 'at_risk' || status === 'blocked_on_client')
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        cfg.classes,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {cfg.label}
      {showOverdue && (
        <span className="opacity-70 font-semibold">· {formatOverdue(overdueDays)}</span>
      )}
    </span>
  )
}
