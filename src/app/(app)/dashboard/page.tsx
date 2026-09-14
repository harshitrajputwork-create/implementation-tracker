import { getSessionUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Client } from '@/lib/types'
import { effectiveStatus } from '@/lib/utils'
import { Plus, Users, TrendingUp, AlertTriangle, Ban } from 'lucide-react'
import { IS_DEV_BYPASS, MOCK_PROFILE, MOCK_CLIENTS } from '@/lib/dev-mock'
import DashboardTable from './DashboardTable'

function StatCard({
  label, value, icon: Icon, color, bg,
}: {
  label: string; value: number; icon: React.ElementType; color: string; bg: string
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

export default async function DashboardPage() {
  let profile = IS_DEV_BYPASS ? MOCK_PROFILE : null
  let rawClients: Client[] = IS_DEV_BYPASS ? MOCK_CLIENTS : []

  if (!IS_DEV_BYPASS) {
    const { supabase, user } = await getSessionUser()
    if (!user) redirect('/login')

    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('clients')
        .select(`*, owner:profiles!owner_id(id, full_name, email, role),
                 plan_steps(id, status, step_order, step_name, ideated_day_range, real_date_completed)`)
        .order('created_at', { ascending: false }),
    ])
    profile = p
    rawClients = (c as Client[]) ?? []
  }

  // Compute effective status for each client
  const clientsWithStatus = rawClients.map((c) => {
    const { status, isAuto, overdueDays } = effectiveStatus(
      c.is_handed_over,
      c.status_override ?? null,
      c.kickoff_date,
      c.plan_steps ?? [],
    )
    return { ...c, _effectiveStatus: status, _isAuto: isAuto, _overdueDays: overdueDays }
  })

  const activeClients = clientsWithStatus.filter((c) => !c.is_handed_over)
  const handedOverClients = clientsWithStatus.filter((c) => c.is_handed_over)

  const counts = {
    active:    activeClients.length,
    on_track:  activeClients.filter((c) => c._effectiveStatus === 'on_track').length,
    at_risk:   clientsWithStatus.filter((c) => c._effectiveStatus === 'at_risk').length,
    blocked:   clientsWithStatus.filter((c) => c._effectiveStatus === 'blocked_on_client').length,
  }

  return (
    <div className="p-8 w-full">
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
        <StatCard label="Active Clients" value={counts.active}   icon={Users}          color="text-blue-600"  bg="bg-blue-50"  />
        <StatCard label="On Track"        value={counts.on_track} icon={TrendingUp}     color="text-green-600" bg="bg-green-50" />
        <StatCard label="At Risk"         value={counts.at_risk}  icon={AlertTriangle}  color="text-amber-600" bg="bg-amber-50" />
        <StatCard label="Blocked"         value={counts.blocked}  icon={Ban}            color="text-red-600"   bg="bg-red-50"   />
      </div>

      {/* Table with filters */}
      {activeClients.length === 0 && handedOverClients.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-xl border border-gray-200">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No clients found</p>
          {profile?.role !== 'visitor' && (
            <Link href="/clients/new" className="text-blue-600 text-sm font-medium mt-2 inline-block hover:underline">
              Create your first client →
            </Link>
          )}
        </div>
      ) : (
        <DashboardTable
          clients={activeClients as any}
          handedOverClients={handedOverClients as any}
          isAdmin={profile?.role === 'admin'}
          isVisitor={profile?.role === 'visitor'}
          userId={profile?.id ?? null}
        />
      )}
    </div>
  )
}
