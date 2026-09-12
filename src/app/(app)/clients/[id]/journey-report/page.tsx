import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import type { Client, PlanStep, DeviationLogEntry, RolloutConfirmation, Profile } from '@/lib/types'
import { IS_DEV_BYPASS, getMockClient, getMockSteps, MOCK_DEVIATION_LOG, MOCK_ROLLOUT } from '@/lib/dev-mock'

const stepStatusLabel: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
}

export default async function JourneyReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let typedClient: Client
  let typedSteps: PlanStep[]
  let typedLog: DeviationLogEntry[]
  let typedRollout: RolloutConfirmation | null

  if (IS_DEV_BYPASS) {
    const mc = getMockClient(id)
    if (!mc) notFound()
    typedClient = mc
    typedSteps = getMockSteps(id)
    typedLog = MOCK_DEVIATION_LOG.filter((e) => e.client_id === id)
    typedRollout = id === 'demo-client-1' ? MOCK_ROLLOUT : null
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: client } = await supabase
      .from('clients').select('*, owner:profiles!owner_id(id, full_name, email)')
      .eq('id', id).single()
    if (!client) notFound()

    const { data: planSteps } = await supabase
      .from('plan_steps').select('*').eq('client_id', id).order('step_order')
    const { data: deviationLog } = await supabase
      .from('deviation_log')
      .select('*, author:profiles!author_id(id, full_name, email)')
      .eq('client_id', id).order('created_at', { ascending: true })
    const { data: rollout } = await supabase
      .from('rollout_confirmations')
      .select('*, set_by_profile:profiles!set_by(id, full_name, email)')
      .eq('client_id', id).maybeSingle()

    typedClient = client as Client
    typedSteps = (planSteps ?? []) as PlanStep[]
    typedLog = (deviationLog ?? []) as DeviationLogEntry[]
    typedRollout = rollout as RolloutConfirmation | null
  }
  const owner = client.owner as Profile | null

  const doneSteps = typedSteps.filter((s) => s.status === 'done').length
  const generatedOn = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-white">
      {/* Print controls — hidden when printing */}
      <div className="no-print bg-gray-900 text-white px-8 py-4 flex items-center justify-between">
        <Link
          href={`/clients/${id}`}
          className="text-sm text-gray-300 hover:text-white transition-colors"
        >
          ← Back to client
        </Link>
        <button
          onClick={() => typeof window !== 'undefined' && window.print()}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Report content */}
      <div className="max-w-3xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-6 mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
            Implementation Journey Report · Taqtics
          </p>
          <h1 className="text-3xl font-bold text-gray-900">{typedClient.name}</h1>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            {typedClient.industry && <span>{typedClient.industry}</span>}
            {typedClient.company_size && (
              <>
                <span>·</span>
                <span>{typedClient.company_size}</span>
              </>
            )}
            {owner && (
              <>
                <span>·</span>
                <span>Implementation: {owner.full_name ?? owner.email}</span>
              </>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">Generated {generatedOn}</p>
        </div>

        {/* Summary block */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Kickoff</p>
            <p className="font-semibold text-gray-900">{formatDate(typedClient.kickoff_date)}</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Rollout date</p>
            <p className="font-semibold text-gray-900">
              {typedRollout ? formatDate(typedRollout.confirmed_date) : 'Not confirmed'}
            </p>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Handover</p>
            <p className="font-semibold text-gray-900">
              {typedClient.is_handed_over
                ? `${typedClient.handed_over_to_kam} · ${formatDate(typedClient.handover_date)}`
                : 'Pending'}
            </p>
          </div>
        </div>

        {/* 30-Day Plan */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            30-Day Implementation Plan
            <span className="text-sm font-normal text-gray-400 ml-2">
              {doneSteps} of {typedSteps.length} steps completed
            </span>
          </h2>

          <table className="w-full border border-gray-200 rounded-xl overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 w-20">
                  Ideated
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                  Step
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 w-28">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 w-32">
                  Completed on
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {typedSteps.map((step) => (
                <tr
                  key={step.id}
                  className={step.status === 'done' ? 'bg-green-50/50' : ''}
                >
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">
                    {step.ideated_day_range}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{step.step_name}</p>
                    {step.notes && (
                      <p className="text-xs text-gray-500 mt-0.5">{step.notes}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${
                        step.status === 'done'
                          ? 'text-green-600'
                          : step.status === 'in_progress'
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {stepStatusLabel[step.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {step.real_date_completed
                      ? formatDate(step.real_date_completed)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Deviation log */}
        {typedLog.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Deviation Log</h2>
            <div className="space-y-3">
              {typedLog.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-gray-200 rounded-xl px-5 py-4"
                >
                  <p className="text-xs text-gray-400 mb-1.5">
                    {formatDateTime(entry.created_at)}
                    {entry.author && (
                      <> · {(entry.author as Profile).full_name ?? (entry.author as Profile).email}</>
                    )}
                  </p>
                  <p className="text-sm text-gray-700">{entry.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rollout confirmation */}
        {typedRollout && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Rollout Confirmation</h2>
            <div className="border border-gray-200 rounded-xl px-5 py-4">
              <p className="text-sm text-gray-700">
                Go-live date confirmed:{' '}
                <strong>{formatDate(typedRollout.confirmed_date)}</strong>
              </p>
              {typedRollout.notes && (
                <p className="text-sm text-gray-500 mt-1">{typedRollout.notes}</p>
              )}
            </div>
          </div>
        )}

        {/* Handover */}
        {typedClient.is_handed_over && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 mb-4">KAM Handover</h2>
            <div className="border-2 border-violet-200 rounded-xl px-5 py-4 bg-violet-50">
              <p className="text-sm text-violet-800">
                Account handed over to{' '}
                <strong>{typedClient.handed_over_to_kam}</strong> on{' '}
                <strong>{formatDate(typedClient.handover_date)}</strong>.
              </p>
              <p className="text-xs text-violet-600 mt-1.5">
                Full store adoption is the KAM&apos;s ongoing responsibility from this point.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 mt-8">
          <p className="text-xs text-gray-400 text-center">
            Generated by Implementation Tracker · Taqtics · {generatedOn}
          </p>
        </div>
      </div>
    </div>
  )
}
