'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client, ClientStatus } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import { formatDate, daysSince } from '@/lib/utils'
import { Clock, X, ArrowUpRight } from 'lucide-react'
import { TicketSizeBadge } from '../clients/[id]/ClientMetaEditor'
import MultiFilter, { unique } from '@/components/MultiFilter'
import QuickMarkDone from './QuickMarkDone'

interface EnrichedClient extends Client {
  _effectiveStatus: ClientStatus
  _isAuto: boolean
  _overdueDays: number
}

interface Props {
  clients: EnrichedClient[]
  handedOverClients?: EnrichedClient[]
  isAdmin: boolean
  isVisitor: boolean
  userId: string | null
}

function getCurrentStep(client: Client): { label: string; step: number | null } {
  const steps = (client.plan_steps ?? []).sort((a, b) => a.step_order - b.step_order)
  const inProgress = steps.find((s) => s.status === 'in_progress')
  if (inProgress) return { label: inProgress.step_name, step: inProgress.step_order }
  const done = steps.filter((s) => s.status === 'done')
  if (done.length === steps.length && steps.length > 0) return { label: 'All steps done', step: 10 }
  if (done.length > 0) return { label: `After step ${done[done.length - 1].step_order}`, step: done[done.length - 1].step_order }
  return { label: 'Not started', step: 0 }
}

function getNextStep(client: Client) {
  const steps = (client.plan_steps ?? []).sort((a, b) => a.step_order - b.step_order)
  const p = steps.find((s) => s.status !== 'done')
  return p ? { id: p.id, name: p.step_name } : null
}

function ProgressBar({ step }: { step: number | null }) {
  const pct = step == null ? 0 : Math.min(100, (step / 10) * 100)
  return (
    <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  )
}

const STATUS_LABELS: Record<string, string> = {
  on_track: 'On Track', at_risk: 'At Risk',
  blocked_on_client: 'Blocked', handed_over: 'Handed Over',
}

export default function DashboardTable({ clients, handedOverClients = [], isAdmin, isVisitor, userId }: Props) {
  const canQuick = (c: EnrichedClient) => !isVisitor && (isAdmin || c.owner_id === userId)
  const router = useRouter()

  const [tab, setTab] = useState<'active' | 'handed_over'>('active')

  const [statusF,  setStatusF]  = useState<string[]>([])
  const [countryF, setCountryF] = useState<string[]>([])
  const [sizeF,    setSizeF]    = useState<string[]>([])
  const [spocF,    setSpocF]    = useState<string[]>([])
  const [kamF,     setKamF]     = useState<string[]>([])

  const statusOpts  = unique(clients.map((c) => STATUS_LABELS[c._effectiveStatus] ?? c._effectiveStatus))
  const countryOpts = unique(clients.map((c) => c.country))
  const sizeOpts    = unique(clients.map((c) => c.ticket_size))
  const spocOpts    = unique(clients.map((c) => c.sales_spoc))
  const kamOpts     = unique(handedOverClients.map((c) => c.handed_over_to_kam))

  const displayed = clients.filter((c) => {
    if (statusF.length  && !statusF.includes(STATUS_LABELS[c._effectiveStatus]  ?? c._effectiveStatus)) return false
    if (countryF.length && !countryF.includes(c.country ?? ''))  return false
    if (sizeF.length    && !sizeF.includes(c.ticket_size ?? ''))  return false
    if (spocF.length    && !spocF.includes(c.sales_spoc ?? ''))   return false
    return true
  })

  const displayedHandedOver = handedOverClients.filter((c) => {
    if (kamF.length && !kamF.includes(c.handed_over_to_kam ?? '')) return false
    return true
  })

  const kamCounts = handedOverClients.reduce<Record<string, number>>((acc, c) => {
    const k = c.handed_over_to_kam ?? 'Unassigned'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  const anyFilter = statusF.length || countryF.length || sizeF.length || spocF.length

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === 'active' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Active ({clients.length})
        </button>
        <button
          onClick={() => setTab('handed_over')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === 'handed_over' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Handed Over ({handedOverClients.length})
        </button>
      </div>

      {tab === 'active' ? (
      <>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <MultiFilter label="Status"      options={statusOpts}  selected={statusF}  onChange={setStatusF} />
        {countryOpts.length > 0 && <MultiFilter label="Country"     options={countryOpts} selected={countryF} onChange={setCountryF} />}
        {sizeOpts.length   > 0 && <MultiFilter label="Ticket size"  options={sizeOpts}    selected={sizeF}    onChange={setSizeF} />}
        {spocOpts.length   > 0 && <MultiFilter label="Sales SPOC"   options={spocOpts}    selected={spocF}    onChange={setSpocF} />}
        {!!anyFilter && (
          <button
            onClick={() => { setStatusF([]); setCountryF([]); setSizeF([]); setSpocF([]) }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
        {!!anyFilter && (
          <span className="text-xs text-gray-400 ml-auto">{displayed.length} of {clients.length}</span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {displayed.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No clients match the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3.5">Client</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">Country</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">Size</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">SPOC</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">Owner</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">Progress</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">Days in</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">Last activity</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map((client) => {
                const { label: stepLabel, step } = getCurrentStep(client)
                const days      = daysSince(client.kickoff_date)
                const lastAct   = client.last_activity_at ?? client.created_at
                const staleDays = daysSince(lastAct)
                const isStale   = staleDays != null && staleDays >= 3 && !client.is_handed_over
                const nextStep  = getNextStep(client)
                const owner     = client.owner as { full_name?: string; email?: string } | null

                return (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {client.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {client.industry && <span className="text-xs text-gray-400">{client.industry}</span>}
                        {client.modules && client.modules.length > 0 && (
                          <>
                            {client.industry && <span className="text-gray-300 text-xs">·</span>}
                            <span className="text-xs text-gray-400">{client.modules.slice(0, 2).join(', ')}{client.modules.length > 2 ? ` +${client.modules.length - 2}` : ''}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{client.country ?? '—'}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <TicketSizeBadge size={client.ticket_size} />
                        {!client.ticket_size && <span className="text-sm text-gray-400">—</span>}
                      </div>
                      {client.company_size && <p className="text-xs text-gray-400 mt-0.5">{client.company_size}</p>}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{client.sales_spoc ?? '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {owner?.full_name ?? owner?.email ?? '—'}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs text-gray-500 mb-1.5 truncate max-w-[140px]">{stepLabel}</p>
                      <div className="flex items-center gap-2">
                        <ProgressBar step={step} />
                        {canQuick(client) && nextStep && !client.is_handed_over && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <QuickMarkDone clientId={client.id} stepId={nextStep.id} stepName={nextStep.name} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {days != null ? <span className={days > 30 ? 'text-red-600 font-semibold' : ''}>{days}d</span> : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        {isStale && <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                        <span className={`text-xs ${isStale ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                          {staleDays === 0 ? 'Today' : staleDays === 1 ? 'Yesterday' : staleDays != null ? `${staleDays}d ago` : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={client._effectiveStatus} size="sm" overdueDays={client._overdueDays} />
                        {client._isAuto && <span className="text-xs text-gray-400">auto</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {client.account_url && (
                        <a
                          href={client.account_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Open account"
                          className="flex items-center justify-center w-7 h-7 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
      </>
      ) : (
      <>
      {/* KAM breakdown */}
      {Object.keys(kamCounts).length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {Object.entries(kamCounts).map(([kam, count]) => (
            <span key={kam} className="flex items-center gap-1.5 text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 px-2.5 py-1 rounded-full">
              {kam}
              <span className="bg-violet-600 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none font-semibold">{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {kamOpts.length > 0 && <MultiFilter label="KAM" options={kamOpts} selected={kamF} onChange={setKamF} />}
        {!!kamF.length && (
          <button
            onClick={() => setKamF([])}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        {!!kamF.length && (
          <span className="text-xs text-gray-400 ml-auto">{displayedHandedOver.length} of {handedOverClients.length}</span>
        )}
      </div>

      {/* Handed-over table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {displayedHandedOver.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {handedOverClients.length === 0 ? 'No accounts handed over yet.' : 'No accounts match the selected filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3.5">Client</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">Country</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">Sales SPOC</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">Implementation Owner</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">KAM</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3.5">Handed over on</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedHandedOver.map((client) => {
                const owner = client.owner as { full_name?: string; email?: string } | null
                return (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="hover:bg-violet-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">{client.name}</p>
                      {client.industry && <p className="text-xs text-gray-400 mt-0.5">{client.industry}</p>}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{client.country ?? '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{client.sales_spoc ?? '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{owner?.full_name ?? owner?.email ?? '—'}</td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">
                        {client.handed_over_to_kam ?? 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{formatDate(client.handover_date)}</td>
                    <td className="px-4 py-4">
                      {client.account_url && (
                        <a
                          href={client.account_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Open account"
                          className="flex items-center justify-center w-7 h-7 text-gray-300 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  )
}
