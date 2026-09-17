'use client'

import { useState, useTransition } from 'react'
import type { DeviationLogEntry, DeviationCause, Profile } from '@/lib/types'
import { formatDateTime, cn } from '@/lib/utils'
import { addDeviationEntryAction } from './actions'
import MentionTextarea from '@/components/MentionTextarea'
import { AlertCircle, Plus } from 'lucide-react'

const CAUSE_OPTIONS: { value: DeviationCause; label: string; color: string }[] = [
  { value: 'client_caused', label: 'Client-caused', color: 'bg-amber-100 text-amber-700' },
  { value: 'internal',      label: 'Internal',      color: 'bg-red-100 text-red-700'    },
  { value: 'other',         label: 'Other',          color: 'bg-gray-100 text-gray-600'  },
]

function highlightMentions(text: string) {
  const parts = text.split(/(@[A-Za-z][\w' -]*)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-blue-600 font-medium">{part}</span>
      : <span key={i}>{part}</span>,
  )
}

function CauseTag({ cause }: { cause: DeviationCause | null }) {
  const cfg = CAUSE_OPTIONS.find((c) => c.value === cause)
  if (!cfg) return null
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', cfg.color)}>
      {cfg.label}
    </span>
  )
}

export default function DeviationLogSection({
  entries,
  clientId,
  canEdit,
  members,
}: {
  entries: DeviationLogEntry[]
  clientId: string
  canEdit: boolean
  members: Profile[]
}) {
  const [note, setNote]             = useState('')
  const [mentionedIds, setMentionedIds] = useState<string[]>([])
  const [cause, setCause]           = useState<DeviationCause>('client_caused')
  const [clientVisible, setClientVisible] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm]     = useState(false)

  function submit() {
    if (!note.trim()) return
    startTransition(async () => {
      await addDeviationEntryAction(clientId, note, cause, clientVisible, mentionedIds)
      setNote('')
      setMentionedIds([])
      setCause('client_caused')
      setClientVisible(false)
      setShowForm(false)
    })
  }

  return (
    <div id="deviation-log">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          Deviation Log
          {entries.length > 0 && (
            <span className="text-xs font-normal text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              {entries.length}
            </span>
          )}
        </h2>
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add entry
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Add form */}
        {canEdit && showForm && (
          <div className="p-4 border-b border-gray-100 bg-amber-50">
            <div className="flex items-center gap-3 mb-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Cause *</label>
                <select
                  value={cause}
                  onChange={(e) => setCause(e.target.value as DeviationCause)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  {CAUSE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2 pb-0.5">
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clientVisible}
                    onChange={(e) => setClientVisible(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Visible in Client Update
                </label>
              </div>
            </div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Log a delay, blocker, or deviation — type @ to tag someone
            </label>
            <MentionTextarea
              value={note}
              onChange={setNote}
              members={members}
              mentionedIds={mentionedIds}
              onMentionedIdsChange={setMentionedIds}
              rows={3}
              autoFocus
              placeholder="e.g. Client SPOC unavailable for D11 sign-off. Rescheduled to 15 Sep. Reason: internal audit week."
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={submit}
                disabled={isPending || !note.trim()}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Save entry'}
              </button>
              <button
                onClick={() => { setShowForm(false); setNote('') }}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Entries */}
        {entries.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-400">No deviations logged</p>
            {canEdit && !showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="text-blue-600 text-sm font-medium mt-1.5 hover:underline"
              >
                Log the first one
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map((entry) => (
              <div key={entry.id} id={`dev-${entry.id}`} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-medium text-gray-500">
                    {formatDateTime(entry.created_at)}
                  </span>
                  {entry.author && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-500">
                        {entry.author.full_name ?? entry.author.email}
                      </span>
                    </>
                  )}
                  {entry.cause && <CauseTag cause={entry.cause} />}
                  {entry.client_visible && (
                    <span className="text-xs text-blue-500 font-medium">· client-visible</span>
                  )}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{highlightMentions(entry.note)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
