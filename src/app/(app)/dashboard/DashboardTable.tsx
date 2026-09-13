'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Client, ClientStatus } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import { formatDate, daysSince } from '@/lib/utils'
import { ChevronDown, Clock, Filter, X } from 'lucide-react'
import { TicketSizeBadge } from '../clients/[id]/ClientMetaEditor'
import QuickMarkDone from './QuickMarkDone'

interface EnrichedClient extends Client {
  _effectiveStatus: ClientStatus
  _isAuto: boolean
}

interface Props {
  clients: EnrichedClient[]
  canQuick: (c: EnrichedClient) => boolean
}

type FilterKey = 'status' | 'country' | 'ticket_size' | 'sales_spoc'

function unique(arr: (string | null | undefined)[]): string[] {
  return [...new Set(arr.filter(Boolean))] as string[]
}

function MultiFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v])
  }

  const active = selected.length > 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
          active
            ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        {label}
        {active && (
          <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none font-semibold">
            {selected.length}
          </span>
        )}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[180px] py-1">
          {options.length === 0 && (
            <p className="text-xs text-gray-400 px-3 py-2">No values</p>
          )}
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
          {active && (
            <button
              onClick={() => onChange([])}
              className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-t border-gray-100 mt-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
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

export default function DashboardTable({ clients, canQuick }: Props) {
  const router = useRouter()

  const [statusF,  setStatusF]  = useState<string[]>([])
  const [countryF, setCountryF] = useState<string[]>([])
  const [sizeF,    setSizeF]    = useState<string[]>([])
  const [spocF,    setSpocF]    = useState<string[]>([])

  const statusOpts  = unique(clients.map((c) => STATUS_LABELS[c._effectiveStatus] ?? c._effectiveStatus))
  const countryOpts = unique(clients.map((c) => c.country))
  const sizeOpts    = unique(clients.map((c) => c.ticket_size))
  const spocOpts    = unique(clients.map((c) => c.sales_spoc))

  const displayed = clients.filter((c) => {
    if (statusF.length  && !statusF.includes(STATUS_LABELS[c._effectiveStatus]  ?? c._effectiveStatus)) return false
    if (countryF.length && !countryF.includes(c.country ?? ''))  return false
    if (sizeF.length    && !sizeF.includes(c.ticket_size ?? ''))  return false
    if (spocF.length    && !spocF.includes(c.sales_spoc ?? ''))   return false
    return true
  })

  const anyFilter = statusF.length || countryF.length || sizeF.length || spocF.length

  return (
    <div>
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
                      <TicketSizeBadge size={client.ticket_size} />
                      {!client.ticket_size && <span className="text-sm text-gray-400">—</span>}
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
                        <StatusBadge status={client._effectiveStatus} size="sm" />
                        {client._isAuto && <span className="text-xs text-gray-400">auto</span>}
                      </div>
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
