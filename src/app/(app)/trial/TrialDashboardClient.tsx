'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FlaskConical, ExternalLink } from 'lucide-react'
import { addTrialAccountAction } from './actions'
import { TZ_AHEAD_OPTIONS, TZ_BEHIND_OPTIONS, TZ_SAME_AS_IST } from '@/lib/schedule-options'
import { daysSince } from '@/lib/utils'
import type { TrialAccount, TrialStatus, ConfigOption, Profile } from '@/lib/types'

const STATUSES: TrialStatus[] = ['Active', 'Stalled', 'Converted', 'Lost']
const STATUS_COLOR: Record<TrialStatus, string> = {
  Active:    'bg-teal-100 text-teal-700 border-teal-200',
  Stalled:   'bg-amber-100 text-amber-700 border-amber-200',
  Converted: 'bg-green-100 text-green-700 border-green-200',
  Lost:      'bg-gray-100 text-gray-500 border-gray-200',
}

const inputCls = 'text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white'

interface Props {
  initialTrials: TrialAccount[]
  configOptions: ConfigOption[]
  members: Profile[]
}

export default function TrialDashboardClient({ initialTrials, configOptions }: Props) {
  const router = useRouter()
  const [trials, setTrials] = useState(initialTrials)
  const [statusFilter, setStatusFilter] = useState<TrialStatus | 'All'>('Active')
  const [isPending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [trialUrl, setTrialUrl] = useState('')
  const [salesSpoc, setSalesSpoc] = useState('')
  const [country, setCountry] = useState('')
  const [tzOffset, setTzOffset] = useState('')

  const spocOptions    = configOptions.filter((o) => o.config_key === 'sales_spoc')
  const countryOptions = configOptions.filter((o) => o.config_key === 'country')

  const filtered = useMemo(
    () => (statusFilter === 'All' ? trials : trials.filter((t) => t.status === statusFilter)),
    [trials, statusFilter],
  )

  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = trials.filter((t) => t.status === s).length
    return acc
  }, {})

  function addTrial() {
    if (!name.trim()) return
    setError(null)
    start(async () => {
      const result = await addTrialAccountAction({
        name, trialUrl, salesSpoc, country, tzOffset,
        trialStartDate: new Date().toISOString().split('T')[0],
      })
      if (result.error) { setError(result.error); return }
      if (result.id) router.push(`/trial/${result.id}`)
    })
    setName(''); setTrialUrl(''); setSalesSpoc(''); setCountry(''); setTzOffset('')
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Free Trial</h1>
          <p className="text-gray-500 text-sm">Accounts trialing before implementation · {counts.Active ?? 0} active</p>
        </div>
      </div>

      {/* Quick add */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Log a new trial</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name" className={inputCls} />
          <input value={trialUrl} onChange={(e) => setTrialUrl(e.target.value)} placeholder="Trial URL" className={inputCls} />
          <select value={salesSpoc} onChange={(e) => setSalesSpoc(e.target.value)} className={inputCls}>
            <option value="">Sales SPOC</option>
            {spocOptions.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
          </select>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
            <option value="">Country</option>
            {countryOptions.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
          </select>
          <select value={tzOffset} onChange={(e) => setTzOffset(e.target.value)} className={inputCls}>
            <option value="">Timezone vs IST</option>
            <option value={TZ_SAME_AS_IST}>{TZ_SAME_AS_IST}</option>
            <optgroup label="Ahead of IST">{TZ_AHEAD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</optgroup>
            <optgroup label="Behind IST">{TZ_BEHIND_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</optgroup>
          </select>
        </div>
        <div className="flex justify-end">
          <button
            onClick={addTrial}
            disabled={isPending || !name.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-40 transition-colors"
          >
            <Plus className="w-4 h-4" /> {isPending ? 'Saving…' : 'Add trial account'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-2">Not saved — {error}</p>}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setStatusFilter('All')}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${statusFilter === 'All' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
        >
          All ({trials.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${statusFilter === s ? STATUS_COLOR[s] + ' ring-1 ring-offset-1 ring-teal-400' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
          >
            {s} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No trial accounts here yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Account</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Country</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Sales SPOC</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">In trial</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => {
                  const days = daysSince(t.trial_start_date)
                  const owner = t.owner as Profile | null
                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/trial/${t.id}`)}
                      className="hover:bg-teal-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">{t.name}</p>
                        <p className="text-xs text-gray-400">{owner?.full_name ?? owner?.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{t.country ?? '—'}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{t.sales_spoc ?? '—'}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{days != null ? `${days}d` : '—'}</td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[t.status]}`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-4">
                        {t.trial_url && (
                          <a
                            href={t.trial_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-300 hover:text-teal-600 transition-colors"
                            title="Open trial URL"
                          >
                            <ExternalLink className="w-4 h-4" />
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
    </div>
  )
}
