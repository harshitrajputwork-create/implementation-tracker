'use client'

import { useState, useTransition } from 'react'
import type { Client, RolloutConfirmation } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { setRolloutDateAction, markHandedOverAction, updateClientStatusAction } from './actions'
import { CalendarCheck, UserCheck, ChevronDown } from 'lucide-react'
import type { ClientStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: ClientStatus; label: string; color: string }[] = [
  { value: 'on_track', label: 'On Track', color: 'text-green-600' },
  { value: 'at_risk', label: 'At Risk', color: 'text-amber-600' },
  { value: 'blocked_on_client', label: 'Blocked on Client', color: 'text-red-600' },
  { value: 'handed_over', label: 'Handed Over', color: 'text-violet-600' },
]

export default function HandoverSection({
  client,
  rollout,
  canEdit,
}: {
  client: Client
  rollout: RolloutConfirmation | null
  canEdit: boolean
}) {
  const [isPending, startTransition] = useTransition()

  // Rollout date form
  const [showRolloutForm, setShowRolloutForm] = useState(false)
  const [rolloutDate, setRolloutDate] = useState(
    rollout?.confirmed_date ?? new Date().toISOString().split('T')[0]
  )
  const [rolloutNotes, setRolloutNotes] = useState(rollout?.notes ?? '')

  // Handover form
  const [showHandoverForm, setShowHandoverForm] = useState(false)
  const [kamName, setKamName] = useState(client.handed_over_to_kam ?? '')
  const [handoverDate, setHandoverDate] = useState(
    client.handover_date ?? new Date().toISOString().split('T')[0]
  )

  // Status
  const [status, setStatus] = useState<ClientStatus>(client.status)

  function saveRollout() {
    startTransition(async () => {
      await setRolloutDateAction(client.id, rolloutDate, rolloutNotes)
      setShowRolloutForm(false)
    })
  }

  function saveHandover() {
    if (!kamName.trim()) return
    startTransition(async () => {
      await markHandedOverAction(client.id, kamName, handoverDate)
      setShowHandoverForm(false)
    })
  }

  function changeStatus(newStatus: ClientStatus) {
    setStatus(newStatus)
    startTransition(() => updateClientStatusAction(client.id, newStatus))
  }

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Account Status</h3>
        {canEdit ? (
          <div className="relative">
            <select
              value={status}
              onChange={(e) => changeStatus(e.target.value as ClientStatus)}
              disabled={isPending}
              className="w-full appearance-none px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-8"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        ) : (
          <p className="text-sm font-medium text-gray-700 capitalize">
            {STATUS_OPTIONS.find((s) => s.value === status)?.label}
          </p>
        )}
      </div>

      {/* Rollout confirmation */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-blue-500" />
            Rollout Date
          </h3>
          {canEdit && !showRolloutForm && (
            <button
              onClick={() => setShowRolloutForm(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {rollout ? 'Edit' : 'Set date'}
            </button>
          )}
        </div>

        {rollout && !showRolloutForm ? (
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {formatDate(rollout.confirmed_date)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Confirmed go-live · billing cycle anchor</p>
            {rollout.notes && (
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{rollout.notes}</p>
            )}
          </div>
        ) : !showRolloutForm ? (
          <p className="text-sm text-gray-400">Not confirmed yet</p>
        ) : null}

        {showRolloutForm && canEdit && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Confirmed date
              </label>
              <input
                type="date"
                value={rolloutDate}
                onChange={(e) => setRolloutDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Notes (optional)
              </label>
              <input
                type="text"
                value={rolloutNotes}
                onChange={(e) => setRolloutNotes(e.target.value)}
                placeholder="e.g. Confirmed via email on 14 Sep"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveRollout}
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Confirm'}
              </button>
              <button
                onClick={() => setShowRolloutForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KAM Handover */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-violet-500" />
            KAM Handover
          </h3>
          {canEdit && !client.is_handed_over && !showHandoverForm && (
            <button
              onClick={() => setShowHandoverForm(true)}
              className="text-xs text-violet-600 hover:text-violet-700 font-medium"
            >
              Mark as handed over
            </button>
          )}
        </div>

        {client.is_handed_over ? (
          <div>
            <p className="text-sm text-gray-700">
              Handed over to{' '}
              <span className="font-semibold">{client.handed_over_to_kam}</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDate(client.handover_date)}
            </p>
          </div>
        ) : !showHandoverForm ? (
          <p className="text-sm text-gray-400">Not yet handed over</p>
        ) : null}

        {showHandoverForm && canEdit && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                KAM name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={kamName}
                onChange={(e) => setKamName(e.target.value)}
                placeholder="e.g. Priya Mehta"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Handover date
              </label>
              <input
                type="date"
                value={handoverDate}
                onChange={(e) => setHandoverDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2.5">
              <p className="text-xs text-violet-700">
                This will mark the account as &quot;Handed Over&quot; and lock the implementation timeline. A journey report will be available at the top of this page.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveHandover}
                disabled={isPending || !kamName.trim()}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Confirm handover'}
              </button>
              <button
                onClick={() => setShowHandoverForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
