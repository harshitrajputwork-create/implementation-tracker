import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Client, ClientStatus } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import { formatDate, daysSince } from '@/lib/utils'
import { Plus, Users, TrendingUp, AlertTriangle, Ban } from 'lucide-react'
import { IS_DEV_BYPASS, MOCK_PROFILE, MOCK_CLIENTS } from '@/lib/dev-mock'

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  bg: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
  )
}

function getCurrentStep(client: Client): { label: string; step: number | null } {
  const steps = (client.plan_steps ?? []).sort((a, b) => a.step_order - b.step_order)
  const inProgress = steps.find((s) => s.status === 'in_progress')
  if (inProgress) return { label: `Step ${inProgress.step_order}: ${inProgress.step_name}`, step: inProgress.step_order }
  const done = steps.filter((s) => s.status === 'done')
  if (done.length === steps.length && steps.length > 0) return { label: 'All steps done', step: 10 }
  if (done.length > 0) {
    const last = done[done.length - 1]
    return { label: `After step ${last.step_order}`, step: last.step_order }
  }
  return { label: 'Not started', step: 0 }
}

function ProgressBar({ step }: { step: number | null }) {
  const pct = step == null ? 0 : Math.min(100, (step / 10) * 100)
  return (
    <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-500 rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  let profile = IS_DEV_BYPASS ? MOCK_PROFILE : null
  let rawClients: Client[] = IS_DEV_BYPASS ? MOCK_CLIENTS : []

  if (!IS_DEV_BYPASS) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = p

    const { data: c } = await supabase
      .from('clients')
      .select('*, owner:profiles!owner_id(id, full_name, email, role), plan_steps(id, status, step_order, step_name)')
      .order('created_at', { ascending: false })
    rawClients = (c as Client[]) ?? []
  }

  const params = await searchParams
  const filter = params.filter as ClientStatus | undefined

  const all = rawClients
  const activeClients = all.filter((c) => !c.is_handed_over)

  const displayed = filter
    ? all.filter((c) => c.status === filter)
    : activeClients

  const counts = {
    active: activeClients.length,
    on_track: all.filter((c) => c.status === 'on_track' && !c.is_handed_over).length,
    at_risk: all.filter((c) => c.status === 'at_risk').length,
    blocked: all.filter((c) => c.status === 'blocked_on_client').length,
  }

  const filterTabs = [
    { label: 'Active', value: undefined },
    { label: 'On Track', value: 'on_track' as ClientStatus },
    { label: 'At Risk', value: 'at_risk' as ClientStatus },
    { label: 'Blocked', value: 'blocked_on_client' as ClientStatus },
    { label: 'Handed Over', value: 'handed_over' as ClientStatus },
  ]

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            All active client implementations · {activeClients.length} active
          </p>
        </div>
        {profile?.role !== 'visitor' && (
          <Link
            href="/clients/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            New Client
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Clients"
          value={counts.active}
          icon={Users}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          label="On Track"
          value={counts.on_track}
          icon={TrendingUp}
          color="text-green-600"
          bg="bg-green-50"
        />
        <StatCard
          label="At Risk"
          value={counts.at_risk}
          icon={AlertTriangle}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard
          label="Blocked on Client"
          value={counts.blocked}
          icon={Ban}
          color="text-red-600"
          bg="bg-red-50"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {filterTabs.map(({ label, value }) => {
          const isActive = filter === value || (!filter && value === undefined)
          return (
            <Link
              key={label}
              href={value ? `?filter=${value}` : '/dashboard'}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {displayed.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No clients found</p>
            {profile?.role !== 'visitor' && !filter && (
              <Link
                href="/clients/new"
                className="text-blue-600 text-sm font-medium mt-2 inline-block hover:underline"
              >
                Create your first client →
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3.5">
                  Client
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">
                  Owner
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">
                  Progress
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">
                  Days In
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">
                  Kickoff
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">
                  Status
                </th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map((client) => {
                const { label: stepLabel, step } = getCurrentStep(client)
                const days = daysSince(client.kickoff_date)
                return (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {client.name}
                      </p>
                      {client.industry && (
                        <p className="text-sm text-gray-400 mt-0.5">{client.industry}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {(client.owner as { full_name?: string; email?: string } | null)?.full_name ??
                        (client.owner as { full_name?: string; email?: string } | null)?.email ??
                        '—'}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs text-gray-500 mb-1.5 truncate max-w-[160px]">
                        {stepLabel}
                      </p>
                      <ProgressBar step={step} />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {days != null ? (
                        <span
                          className={days > 30 ? 'text-red-600 font-semibold' : ''}
                        >
                          {days}d
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(client.kickoff_date)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={client.status} size="sm" />
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-blue-600 text-sm font-medium hover:text-blue-700 whitespace-nowrap"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
