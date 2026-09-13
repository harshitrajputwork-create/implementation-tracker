import { getSessionUser } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { Client, PlanStep, DeviationLogEntry, RolloutConfirmation, UseCase, ClientUseCase } from '@/lib/types'
import { IS_DEV_BYPASS, getMockClient, getMockSteps } from '@/lib/dev-mock'
import PrintButton from './PrintButton'

const stepStageLabel: Record<string, string> = {
  done:        'Complete',
  in_progress: 'In progress',
  not_started: 'Coming up',
}

export default async function ClientUpdatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let typedClient: Client
  let typedSteps: PlanStep[]
  let typedLog: DeviationLogEntry[]
  let typedRollout: RolloutConfirmation | null
  let usingItems: UseCase[] = []
  let notYetItems: UseCase[] = []

  if (IS_DEV_BYPASS) {
    const mc = getMockClient(id)
    if (!mc) notFound()
    typedClient = mc
    typedSteps  = getMockSteps(id)
    typedLog    = []
    typedRollout = null
  } else {
    const { supabase, user } = await getSessionUser()
    if (!user) redirect('/login')

    const { data: client } = await supabase
      .from('clients')
      .select('*, owner:profiles!owner_id(id, full_name, email)')
      .eq('id', id)
      .single()
    if (!client) notFound()

    const { data: planSteps } = await supabase
      .from('plan_steps').select('*').eq('client_id', id).order('step_order')

    const { data: deviationLog } = await supabase
      .from('deviation_log')
      .select('*')
      .eq('client_id', id)
      .eq('client_visible', true)
      .order('created_at', { ascending: true })

    const { data: rollout } = await supabase
      .from('rollout_confirmations').select('*').eq('client_id', id).maybeSingle()

    // Growth use cases
    const { data: cuc } = await supabase
      .from('client_use_cases')
      .select('*, use_case:use_cases(*)')
      .eq('client_id', id)

    const clientUseCases = (cuc ?? []) as ClientUseCase[]
    usingItems    = clientUseCases.filter((c) => c.is_using  && c.use_case).map((c) => c.use_case!)
    notYetItems   = clientUseCases.filter((c) => !c.is_using && c.use_case).map((c) => c.use_case!)

    typedClient  = client as Client
    typedSteps   = (planSteps ?? []) as PlanStep[]
    typedLog     = (deviationLog ?? []) as DeviationLogEntry[]
    typedRollout = rollout as RolloutConfirmation | null
  }

  const doneCount = typedSteps.filter((s) => s.status === 'done').length
  const generatedOn = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-white">
      {/* Print controls */}
      <div className="no-print bg-gray-900 text-white px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/clients/${id}`} className="text-sm text-gray-300 hover:text-white transition-colors">
            ← Back to client
          </Link>
          <Link href={`/clients/${id}/journey-report`} className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
            Internal report →
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-green-700 text-white rounded-full px-2.5 py-1 font-medium">Client-safe · no internal data</span>
          <PrintButton />
        </div>
      </div>

      {/* Report content */}
      <div className="max-w-3xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-6 mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
            Implementation Update · Taqtics
          </p>
          <h1 className="text-3xl font-bold text-gray-900">{typedClient.name}</h1>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            {typedClient.industry && <span>{typedClient.industry}</span>}
            {typedClient.company_size && <><span>·</span><span>{typedClient.company_size}</span></>}
          </div>
          <p className="text-xs text-gray-400 mt-2">Prepared {generatedOn}</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Kickoff</p>
            <p className="font-semibold text-gray-900">{formatDate(typedClient.kickoff_date)}</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Go-live</p>
            <p className="font-semibold text-gray-900">
              {typedRollout ? formatDate(typedRollout.confirmed_date) : 'To be confirmed'}
            </p>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Progress</p>
            <p className="font-semibold text-gray-900">{doneCount} / {typedSteps.length} milestones</p>
          </div>
        </div>

        {/* Steps */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Implementation milestones</h2>
          <div className="space-y-2">
            {typedSteps.map((step) => (
              <div
                key={step.id}
                className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border ${
                  step.status === 'done'
                    ? 'bg-green-50 border-green-200'
                    : step.status === 'in_progress'
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  step.status === 'done' ? 'bg-green-500' :
                  step.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{step.step_name}</p>
                  {step.notes_client_visible && step.notes && (
                    <p className="text-xs text-gray-500 mt-0.5">{step.notes}</p>
                  )}
                </div>
                <span className={`text-xs font-semibold flex-shrink-0 ${
                  step.status === 'done' ? 'text-green-700' :
                  step.status === 'in_progress' ? 'text-blue-700' : 'text-gray-400'
                }`}>
                  {stepStageLabel[step.status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Client-visible deviation notes */}
        {typedLog.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Updates & notes</h2>
            <div className="space-y-3">
              {typedLog.map((entry) => (
                <div key={entry.id} className="border border-gray-200 rounded-xl px-5 py-4">
                  <p className="text-xs text-gray-400 mb-1">
                    {new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-gray-700">{entry.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Growth section */}
        {(usingItems.length > 0 || notYetItems.length > 0) && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Value & growth</h2>

            {usingItems.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">What you&apos;re already getting value from</h3>
                <div className="space-y-2">
                  {usingItems.map((uc) => (
                    <div key={uc.id} className="flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{uc.title}</p>
                        {uc.description && <p className="text-xs text-gray-500 mt-0.5">{uc.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {notYetItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-3">What else you could explore</h3>
                <div className="space-y-2">
                  {notYetItems.map((uc) => (
                    <div key={uc.id} className="flex items-start gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{uc.title}</p>
                        {uc.description && <p className="text-xs text-gray-500 mt-0.5">{uc.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rollout / handover */}
        {typedClient.is_handed_over && (
          <div className="mb-10">
            <div className="border-2 border-violet-200 rounded-xl px-5 py-4 bg-violet-50">
              <p className="text-sm text-violet-800">
                Implementation complete. Account transitioned to your dedicated success manager{' '}
                <strong>{typedClient.handed_over_to_kam}</strong> on{' '}
                <strong>{formatDate(typedClient.handover_date)}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 mt-8">
          <p className="text-xs text-gray-400 text-center">
            Prepared by Taqtics · {generatedOn}
          </p>
        </div>
      </div>
    </div>
  )
}
