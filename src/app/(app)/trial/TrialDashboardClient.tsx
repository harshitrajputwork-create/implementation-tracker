'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FlaskConical, ExternalLink, X } from 'lucide-react'
import { addTrialAccountAction } from './actions'
import { daysSince, subdomainOf } from '@/lib/utils'
import { TICKET_SIZES, TICKET_SIZE_COLOR } from '@/lib/ticket-size'
import MultiFilter, { unique } from '@/components/MultiFilter'
import type { TrialAccount, TrialStatus, ConfigOption, Profile } from '@/lib/types'

const STATUSES: TrialStatus[] = ['Active', 'Stalled', 'Converted', 'Lost']
const STATUS_COLOR: Record<TrialStatus, string> = {
  Active:    'bg-purple-100 text-purple-700 border-purple-200',
  Stalled:   'bg-amber-100 text-amber-700 border-amber-200',
  Converted: 'bg-green-100 text-green-700 border-green-200',
  Lost:      'bg-gray-100 text-gray-500 border-gray-200',
}

const inputCls = 'text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white'

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
  const [companySize, setCompanySize] = useState('')

  const [countryF, setCountryF] = useState<string[]>([])
  const [spocF, setSpocF]       = useState<string[]>([])
  const [sizeF, setSizeF]       = useState<string[]>([])

  const spocOptions    = configOptions.filter((o) => o.config_key === 'sales_spoc')
  const countryOptions = configOptions.filter((o) => o.config_key === 'country')

  const countryOpts = unique(trials.map((t) => t.country))
  const spocOpts     = unique(trials.map((t) => t.sales_spoc))
  const sizeOpts      = unique(trials.map((t) => t.company_size))
  const anyFilter = countryF.length || spocF.length || sizeF.length

  const filtered = useMemo(
    () => trials.filter((t) => {
      if (statusFilter !== 'All' && t.status !== statusFilter) return false
      if (countryF.length && !countryF.includes(t.country ?? '')) return false
      if (spocF.length && !spocF.includes(t.sales_spoc ?? '')) return false
      if (sizeF.length && !sizeF.includes(t.company_size ?? '')) return false
      return true
    }),
    [trials, statusFilter, countryF, spocF, sizeF],
  )

  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = trials.filter((t) => t.status === s).length
    return acc
  }, {})

  function addTrial() {
    if (!name.trim()) return
    setError(null)
    start(async () => {
      const result = await addTrialAccountAction({ name, trialUrl, salesSpoc, country, companySize })
      if (result.error) { setError(result.error); return }
      if (result.id) router.push(`/trial/${result.id}`)
    })
    setName(''); setTrialUrl(''); setSalesSpoc(''); setCountry(''); setCompanySize('')
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-purple-500" />
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
          <select value={companySize} onChange={(e) => setCompanySize(e.target.value)} className={inputCls}>
            <option value="">Size of account</option>
            {TICKET_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <p className="text-[11px] text-gray-400 mb-2">Trial start date isn&apos;t set here — add it on the account page once the trial actually kicks off.</p>
        <div className="flex justify-end">
          <button
            onClick={addTrial}
            disabled={isPending || !name.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-500 text-white text-sm font-semibold rounded-lg hover:bg-purple-600 disabled:opacity-40 transition-colors"
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
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${statusFilter === s ? STATUS_COLOR[s] + ' ring-1 ring-offset-1 ring-purple-400' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
          >
            {s} ({counts[s] ?? 0})
          </button>
        ))}
        <span className="w-px h-5 bg-gray-200 mx-1" />
        {countryOpts.length > 0 && <MultiFilter label="Country" options={countryOpts} selected={countryF} onChange={setCountryF} accentColor="purple" />}
        {spocOpts.length > 0 && <MultiFilter label="Sales SPOC" options={spocOpts} selected={spocF} onChange={setSpocF} accentColor="purple" />}
        {sizeOpts.length > 0 && <MultiFilter label="Size" options={sizeOpts} selected={sizeF} onChange={setSizeF} accentColor="purple" />}
        {!!anyFilter && (
          <button
            onClick={() => { setCountryF([]); setSpocF([]); setSizeF([]) }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
          >
            <X className="w-3 h-3" /> Clear filters
          </button>
        )}
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
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Size</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">In trial</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Subdomain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => {
                  const days = daysSince(t.trial_start_date)
                  const owner = t.owner as Profile | null
                  const sub = subdomainOf(t.trial_url)
                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/trial/${t.id}`)}
                      className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">{t.name}</p>
                        <p className="text-xs text-gray-400">{owner?.full_name ?? owner?.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{t.country ?? '—'}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{t.sales_spoc ?? '—'}</td>
                      <td className="px-4 py-4">
                        {t.company_size ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TICKET_SIZE_COLOR[t.company_size] ?? ''}`}>
                            {t.company_size}
                          </span>
                        ) : <span className="text-sm text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{days != null ? `${days}d` : '—'}</td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[t.status]}`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-4">
                        {t.trial_url && sub ? (
                          <a
                            href={t.trial_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors"
                            title={t.trial_url}
                          >
                            {sub} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : <span className="text-sm text-gray-400">—</span>}
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
