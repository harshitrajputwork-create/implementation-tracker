'use client'

import { useState, useTransition } from 'react'
import type { Client, Profile, ConfigOption } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { markHandedOverAction } from './actions'

interface Props {
  client: Client
  owner: Profile | null
  canEdit: boolean
  configOptions: ConfigOption[]
}

export default function ClientLifecycle({ client, owner, canEdit, configOptions }: Props) {
  const kamOptions = configOptions.filter((o) => o.config_key === 'kam')
  const [showForm, setShowForm] = useState(false)
  const [kamName, setKamName]   = useState(client.handed_over_to_kam ?? '')
  const [kamDate, setKamDate]   = useState(
    client.handover_date ?? new Date().toISOString().split('T')[0],
  )
  const [isPending, start] = useTransition()

  function save() {
    if (!kamName.trim()) return
    start(async () => {
      await markHandedOverAction(client.id, kamName, kamDate)
      setShowForm(false)
    })
  }

  const nodes = [
    {
      key: 'sales',
      label: 'Sales',
      name: client.sales_spoc ?? null,
      sub: null as string | null,
      done: !!client.sales_spoc,
      dot: 'bg-orange-400',
    },
    {
      key: 'impl',
      label: 'Implementation',
      name: owner?.full_name ?? owner?.email ?? null,
      sub: client.kickoff_date ? `Kickoff ${formatDate(client.kickoff_date)}` : null,
      done: true,
      dot: 'bg-blue-500',
    },
    {
      key: 'kam',
      label: 'KAM',
      name: client.handed_over_to_kam ?? null,
      sub: client.handover_date ? formatDate(client.handover_date) : null,
      done: client.is_handed_over,
      dot: 'bg-violet-500',
    },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Journey</p>
      <div>
        {nodes.map((node, idx) => (
          <div key={node.key} className="flex gap-2.5">
            {/* Spine */}
            <div className="flex flex-col items-center flex-shrink-0" style={{ width: 12 }}>
              <div
                className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${
                  node.done ? node.dot : 'bg-white border-2 border-gray-300'
                }`}
              />
              {idx < nodes.length - 1 && (
                <div className="w-px flex-1 bg-gray-200 my-0.5" style={{ minHeight: 28 }} />
              )}
            </div>

            {/* Content */}
            <div className={idx < nodes.length - 1 ? 'pb-3' : 'pb-0'}>
              <p className="text-xs font-semibold text-gray-700 leading-tight">{node.label}</p>
              {node.name ? (
                <p className="text-xs text-gray-500 leading-tight">
                  {node.name}
                  {node.sub && <span className="text-gray-400"> · {node.sub}</span>}
                </p>
              ) : (
                <p className="text-[11px] text-gray-400">—</p>
              )}

              {/* KAM handover CTA */}
              {node.key === 'kam' && !node.done && canEdit && (
                showForm ? (
                  <div className="mt-1.5 space-y-1">
                    <select
                      value={kamName}
                      onChange={(e) => setKamName(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white"
                    >
                      <option value="">Select KAM…</option>
                      {kamOptions.map((o) => (
                        <option key={o.id} value={o.label}>{o.label}</option>
                      ))}
                      {kamName && !kamOptions.some((o) => o.label === kamName) && (
                        <option value={kamName}>{kamName}</option>
                      )}
                    </select>
                    <input
                      type="date"
                      value={kamDate}
                      onChange={(e) => setKamDate(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={save}
                        disabled={isPending || !kamName.trim()}
                        className="px-2.5 py-1 bg-violet-600 text-white text-xs rounded-md hover:bg-violet-700 disabled:opacity-40"
                      >
                        {isPending ? '…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setShowForm(false)}
                        className="text-xs text-gray-400 hover:text-gray-600 px-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-0.5 text-[11px] text-violet-600 hover:text-violet-700 font-medium"
                  >
                    Mark as handed over →
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
