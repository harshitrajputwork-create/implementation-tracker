import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import PlanTimeline from './PlanTimeline'
import DeviationLogSection from './DeviationLogSection'
import HandoverSection from './HandoverSection'
import { formatDate } from '@/lib/utils'
import { ChevronLeft, FileText } from 'lucide-react'
import type { Client, PlanStep, DeviationLogEntry, RolloutConfirmation, Profile } from '@/lib/types'
import {
  IS_DEV_BYPASS, MOCK_PROFILE, getMockClient, getMockSteps,
  MOCK_DEVIATION_LOG, MOCK_ROLLOUT
} from '@/lib/dev-mock'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let profile = IS_DEV_BYPASS ? MOCK_PROFILE : null
  let typedClient: Client
  let typedSteps: PlanStep[]
  let typedLog: DeviationLogEntry[]
  let typedRollout: RolloutConfirmation | null = null
  let canEdit = false

  if (IS_DEV_BYPASS) {
    const mc = getMockClient(id)
    if (!mc) notFound()
    typedClient = mc
    typedSteps = getMockSteps(id)
    typedLog = MOCK_DEVIATION_LOG.filter((e) => e.client_id === id)
    typedRollout = id === 'demo-client-1' ? MOCK_ROLLOUT : null
    canEdit = true
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = p

    const { data: client } = await supabase
      .from('clients')
      .select('*, owner:profiles!owner_id(id, full_name, email, role)')
      .eq('id', id)
      .single()
    if (!client) notFound()

    const { data: planSteps } = await supabase
      .from('plan_steps').select('*').eq('client_id', id).order('step_order')
    const { data: deviationLog } = await supabase
      .from('deviation_log')
      .select('*, author:profiles!author_id(id, full_name, email)')
      .eq('client_id', id).order('created_at', { ascending: false })
    const { data: rollout } = await supabase
      .from('rollout_confirmations')
      .select('*, set_by_profile:profiles!set_by(id, full_name, email)')
      .eq('client_id', id).maybeSingle()

    typedClient = client as Client
    typedSteps = (planSteps ?? []) as PlanStep[]
    typedLog = (deviationLog ?? []) as DeviationLogEntry[]
    typedRollout = rollout as RolloutConfirmation | null
    canEdit =
      profile?.role === 'admin' ||
      (profile?.role === 'member' && client.owner_id === user.id)
  }

  const owner = typedClient.owner as Profile | null

  return (
    <div className="p-8 max-w-7xl">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5 w-fit"
      >
        <ChevronLeft className="w-4 h-4" />
        Dashboard
      </Link>

      {/* Client header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{typedClient.name}</h1>
            <StatusBadge status={typedClient.status} />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {typedClient.industry && <span>{typedClient.industry}</span>}
            {typedClient.industry && typedClient.kickoff_date && (
              <span className="text-gray-300">·</span>
            )}
            {typedClient.kickoff_date && (
              <span>Kickoff {formatDate(typedClient.kickoff_date)}</span>
            )}
            {owner && (
              <>
                <span className="text-gray-300">·</span>
                <span>
                  Owner: <span className="font-medium text-gray-700">{owner.full_name ?? owner.email}</span>
                </span>
              </>
            )}
            {typedClient.company_size && (
              <>
                <span className="text-gray-300">·</span>
                <span>{typedClient.company_size}</span>
              </>
            )}
          </div>
          {typedClient.notes && (
            <p className="text-sm text-gray-500 mt-2 max-w-xl">{typedClient.notes}</p>
          )}
        </div>

        {/* Journey report link */}
        <Link
          href={`/clients/${id}/journey-report`}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <FileText className="w-4 h-4" />
          Journey Report
        </Link>
      </div>

      {/* Handover banner */}
      {typedClient.is_handed_over && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-5 py-4 mb-6 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
          <p className="text-sm text-violet-700">
            This account was handed over to{' '}
            <strong>{typedClient.handed_over_to_kam}</strong> on{' '}
            {formatDate(typedClient.handover_date)}.{' '}
            <Link
              href={`/clients/${id}/journey-report`}
              className="underline hover:no-underline"
            >
              View journey report
            </Link>
          </p>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-3 gap-8">
        {/* Left: Plan timeline */}
        <div className="col-span-2 space-y-8">
          <PlanTimeline
            steps={typedSteps}
            clientId={id}
            canEdit={canEdit}
            kickoffDate={typedClient.kickoff_date}
          />
          <DeviationLogSection
            entries={typedLog}
            clientId={id}
            canEdit={canEdit}
          />
        </div>

        {/* Right: Actions */}
        <div className="col-span-1">
          <HandoverSection
            client={typedClient}
            rollout={typedRollout}
            canEdit={canEdit}
          />
        </div>
      </div>
    </div>
  )
}
