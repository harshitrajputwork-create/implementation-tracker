import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import PlanTimeline from './PlanTimeline'
import DeviationLogSection from './DeviationLogSection'
import HandoverSection from './HandoverSection'
import GrowthTab from './GrowthTab'
import ActivityLog from './ActivityLog'
import ClientMetaEditor, { TicketSizeBadge } from './ClientMetaEditor'
import { formatDate } from '@/lib/utils'
import { ChevronLeft, FileText, Send, MapPin, User2, Package, ExternalLink } from 'lucide-react'
import type { Client, PlanStep, DeviationLogEntry, RolloutConfirmation, Profile, UseCase, ClientUseCase, ActivityEntry, ConfigOption } from '@/lib/types'
import {
  IS_DEV_BYPASS, MOCK_PROFILE, getMockClient, getMockSteps,
  MOCK_DEVIATION_LOG, MOCK_ROLLOUT,
} from '@/lib/dev-mock'

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id }  = await params
  const { tab } = await searchParams
  const activeTab = tab === 'growth' ? 'growth' : 'plan'

  let profile = IS_DEV_BYPASS ? MOCK_PROFILE : null
  let typedClient: Client
  let typedSteps: PlanStep[]
  let typedLog: DeviationLogEntry[]
  let typedRollout: RolloutConfirmation | null = null
  let canEdit = false
  let useCases: UseCase[] = []
  let clientUseCases: ClientUseCase[] = []
  let activityLog: ActivityEntry[] = []
  let members: Profile[] = []
  let configOptions: ConfigOption[] = []

  if (IS_DEV_BYPASS) {
    const mc = getMockClient(id)
    if (!mc) notFound()
    typedClient = mc
    typedSteps  = getMockSteps(id)
    typedLog    = MOCK_DEVIATION_LOG.filter((e) => e.client_id === id)
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
      .from('rollout_confirmations').select('*').eq('client_id', id).maybeSingle()

    // Growth use cases filtered by industry
    const { data: uc } = await supabase
      .from('use_cases').select('*')
      .or(`industry_tag.is.null,industry_tag.eq.${client.industry ?? ''}`)
    const { data: cuc } = await supabase
      .from('client_use_cases').select('*, use_case:use_cases(*)').eq('client_id', id)

    const { data: actLog } = await supabase
      .from('activity_log')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: mem } = await supabase
      .from('profiles').select('id, full_name, email, role').in('role', ['admin', 'member']).order('full_name')
    const { data: opts } = await supabase
      .from('config_options').select('*').order('sort_order')

    useCases = (uc ?? []) as UseCase[]
    clientUseCases = (cuc ?? []) as ClientUseCase[]
    activityLog = (actLog ?? []) as ActivityEntry[]
    members = (mem ?? []) as Profile[]
    configOptions = (opts ?? []) as ConfigOption[]

    typedClient  = client as Client
    typedSteps   = (planSteps ?? []) as PlanStep[]
    typedLog     = (deviationLog ?? []) as DeviationLogEntry[]
    typedRollout = rollout as RolloutConfirmation | null
    canEdit =
      profile?.role === 'admin' ||
      (profile?.role === 'member' && client.owner_id === user.id)
  }

  const owner = typedClient.owner as Profile | null

  return (
    <div className="p-8 w-full">
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{typedClient.name}</h1>
            <StatusBadge status={typedClient.status} />
            {typedClient.ticket_size && <TicketSizeBadge size={typedClient.ticket_size} />}
            {typedClient.account_url && (
              <a
                href={typedClient.account_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Open account
              </a>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
            {typedClient.industry && <span>{typedClient.industry}</span>}
            {typedClient.company_size && <><span className="text-gray-300">·</span><span>{typedClient.company_size}</span></>}
            {typedClient.kickoff_date && <><span className="text-gray-300">·</span><span>Kickoff {formatDate(typedClient.kickoff_date)}</span></>}
            {owner && <><span className="text-gray-300">·</span><span className="flex items-center gap-1"><User2 className="w-3.5 h-3.5" />{owner.full_name ?? owner.email}</span></>}
            {typedClient.sales_spoc && <><span className="text-gray-300">·</span><span>Sales: {typedClient.sales_spoc}</span></>}
            {typedClient.country && <><span className="text-gray-300">·</span><span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{typedClient.country}</span></>}
          </div>
          {typedClient.modules && typedClient.modules.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Package className="w-3.5 h-3.5 text-gray-400" />
              {typedClient.modules.map((m) => (
                <span key={m} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{m}</span>
              ))}
            </div>
          )}
          {typedClient.notes && (
            <p className="text-sm text-gray-500 mt-2 max-w-xl">{typedClient.notes}</p>
          )}
          <div className="mt-3">
            <ClientMetaEditor
              client={typedClient}
              members={members}
              configOptions={configOptions}
              canEdit={canEdit}
            />
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <Link
            href={`/clients/${id}/client-update`}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <Send className="w-4 h-4" />
            Client Update
          </Link>
          <Link
            href={`/clients/${id}/journey-report`}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            Journey Report
          </Link>
        </div>
      </div>

      {/* Handover banner */}
      {typedClient.is_handed_over && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-5 py-4 mb-6 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
          <p className="text-sm text-violet-700">
            This account was handed over to{' '}
            <strong>{typedClient.handed_over_to_kam}</strong> on{' '}
            {formatDate(typedClient.handover_date)}.{' '}
            <Link href={`/clients/${id}/journey-report`} className="underline hover:no-underline">
              View journey report
            </Link>
          </p>
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { value: 'plan',   label: '30-Day Plan' },
          { value: 'growth', label: 'Growth' },
        ].map(({ value, label }) => (
          <Link
            key={value}
            href={value === 'plan' ? `/clients/${id}` : `/clients/${id}?tab=${value}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'growth' ? (
        <GrowthTab
          clientId={id}
          industry={typedClient.industry}
          useCases={useCases}
          clientUseCases={clientUseCases}
          canEdit={canEdit}
        />
      ) : (
        <div className="flex gap-8 items-start">
          {/* Left: Plan timeline — fills all remaining space */}
          <div className="flex-1 min-w-0 space-y-8">
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
            <ActivityLog entries={activityLog} />
          </div>

          {/* Right: Actions — fixed width */}
          <div className="w-72 flex-shrink-0">
            <HandoverSection
              client={typedClient}
              rollout={typedRollout}
              canEdit={canEdit}
            />
          </div>
        </div>
      )}
    </div>
  )
}
