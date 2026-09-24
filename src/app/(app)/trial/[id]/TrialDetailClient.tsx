'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ExternalLink, CalendarClock, Trash2, Send, ArrowRight, Pencil, Check, X,
} from 'lucide-react'
import MentionTextarea from '@/components/MentionTextarea'
import { updateTrialAccountAction, addTrialNoteAction, deleteTrialNoteAction, toggleTrialNoteDeadlineDoneAction, deleteTrialAccountAction } from '../actions'
import { formatDate, daysSince } from '@/lib/utils'
import { TICKET_SIZES, TICKET_SIZE_COLOR } from '@/lib/ticket-size'
import type { TrialAccount, TrialStatus, ClientNoteEntry, ConfigOption, Profile } from '@/lib/types'

const STATUSES: TrialStatus[] = ['Active', 'Stalled', 'Converted', 'Lost']
const STATUS_COLOR: Record<TrialStatus, string> = {
  Active:    'bg-purple-100 text-purple-700 border-purple-200',
  Stalled:   'bg-amber-100 text-amber-700 border-amber-200',
  Converted: 'bg-green-100 text-green-700 border-green-200',
  Lost:      'bg-gray-100 text-gray-500 border-gray-200',
}

function highlightMentions(text: string) {
  const parts = text.split(/(@[A-Za-z][\w' -]*)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-purple-700 font-medium">{part}</span>
      : <span key={i}>{part}</span>,
  )
}

const inputCls = 'text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white'

function NoteRow({ note, currentUserId, onDelete, onToggleDeadline }: {
  note: ClientNoteEntry
  currentUserId: string
  onDelete: () => void
  onToggleDeadline: (done: boolean) => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const isOwn = note.author_id === currentUserId
  const overdue = note.deadline && !note.deadline_done && note.deadline < new Date().toISOString().split('T')[0]

  return (
    <div id={`note-${note.id}`} className="px-4 py-3 group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-700">{note.author_name ?? 'Someone'}</span>
          <span className="text-[10px] text-gray-400">{formatDate(note.created_at)}</span>
        </div>
        {isOwn && (
          <button
            onClick={() => { if (!confirmDel) { setConfirmDel(true); return } onDelete() }}
            title={confirmDel ? 'Click again to confirm' : 'Delete'}
            className={`opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all ${confirmDel ? 'opacity-100 text-red-600 bg-red-50' : 'text-gray-300 hover:text-red-600 hover:bg-red-50'}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">{highlightMentions(note.content)}</p>
      {note.deadline && (
        <button
          onClick={() => isOwn && onToggleDeadline(!note.deadline_done)}
          disabled={!isOwn}
          className={`flex items-center gap-1 mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
            note.deadline_done ? 'bg-green-50 text-green-700 border-green-200'
              : overdue ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          } ${isOwn ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
        >
          <CalendarClock className="w-3 h-3" />
          {note.deadline_done ? 'Done' : overdue ? 'Overdue' : 'Due'} {formatDate(note.deadline)}
        </button>
      )}
    </div>
  )
}

export default function TrialDetailClient({
  trial, notes: initialNotes, currentUserId, configOptions, members, isAdmin,
}: {
  trial: TrialAccount
  notes: ClientNoteEntry[]
  currentUserId: string
  configOptions: ConfigOption[]
  members: Profile[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [notes, setNotes] = useState(initialNotes)
  const [isPending, start] = useTransition()
  const [editing, setEditing] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletePending, startDelete] = useTransition()

  const [name, setName] = useState(trial.name)
  const [trialUrl, setTrialUrl] = useState(trial.trial_url ?? '')
  const [salesSpoc, setSalesSpoc] = useState(trial.sales_spoc ?? '')
  const [country, setCountry] = useState(trial.country ?? '')
  const [companySize, setCompanySize] = useState(trial.company_size ?? '')
  const [modules, setModules] = useState<string[]>(trial.modules ?? [])
  const [startDate, setStartDate] = useState(trial.trial_start_date ?? '')
  const [endDate, setEndDate] = useState(trial.trial_end_date ?? '')

  const [useCaseNotes, setUseCaseNotes] = useState(trial.use_case_notes ?? '')
  const [savingUseCase, setSavingUseCase] = useState(false)

  const [content, setContent] = useState('')
  const [mentionedIds, setMentionedIds] = useState<string[]>([])
  const [showDeadline, setShowDeadline] = useState(false)
  const [deadline, setDeadline] = useState('')

  const spocOptions    = configOptions.filter((o) => o.config_key === 'sales_spoc')
  const countryOptions = configOptions.filter((o) => o.config_key === 'country')
  const moduleOptions  = configOptions.filter((o) => o.config_key === 'module')
  const days = daysSince(trial.trial_start_date)

  function toggleModule(label: string) {
    setModules((prev) => (prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]))
  }

  function saveMeta() {
    start(async () => {
      await updateTrialAccountAction(trial.id, {
        name, trialUrl, salesSpoc, country, companySize, modules,
        trialStartDate: startDate || null, trialEndDate: endDate || null,
      })
      setEditing(false)
      router.refresh()
    })
  }

  function saveUseCaseNotes() {
    setSavingUseCase(true)
    start(async () => {
      await updateTrialAccountAction(trial.id, { useCaseNotes })
      setSavingUseCase(false)
      router.refresh()
    })
  }

  function changeStatus(status: TrialStatus) {
    start(async () => { await updateTrialAccountAction(trial.id, { status }); router.refresh() })
  }

  function handleDelete() {
    if (confirmText !== trial.name) return
    setDeleteError(null)
    startDelete(async () => {
      const result = await deleteTrialAccountAction(trial.id)
      if (result?.error) setDeleteError(result.error)
    })
  }

  function postNote() {
    if (!content.trim()) return
    start(async () => {
      await addTrialNoteAction(trial.id, content, showDeadline ? deadline || null : null, mentionedIds)
      setContent(''); setMentionedIds([]); setShowDeadline(false); setDeadline('')
      router.refresh()
    })
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    start(async () => { await deleteTrialNoteAction(id, trial.id) })
  }

  function toggleDeadline(id: string, done: boolean) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, deadline_done: done } : n)))
    start(async () => { await toggleTrialNoteDeadlineDoneAction(id, trial.id, done) })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {editing ? (
          <div className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} w-full text-lg font-bold`} />
            <div className="grid grid-cols-2 gap-3">
              <input value={trialUrl} onChange={(e) => setTrialUrl(e.target.value)} placeholder="Trial URL" className={`${inputCls} w-full`} />
              <select value={salesSpoc} onChange={(e) => setSalesSpoc(e.target.value)} className={inputCls}>
                <option value="">Sales SPOC — none</option>
                {spocOptions.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
              </select>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
                <option value="">Country — none</option>
                {countryOptions.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
              </select>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Trial start</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Target end (flexible)</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`${inputCls} w-full`} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Size of account</label>
              <div className="flex gap-2 flex-wrap">
                {TICKET_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCompanySize(companySize === s ? '' : s)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                      companySize === s ? TICKET_SIZE_COLOR[s] : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {moduleOptions.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Modules being shown</label>
                <div className="flex flex-wrap gap-1.5">
                  {moduleOptions.map((o) => {
                    const active = modules.includes(o.label)
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => toggleModule(o.label)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                          active ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={saveMeta} disabled={isPending} className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white text-xs font-semibold rounded-lg hover:bg-purple-600 disabled:opacity-40">
                <Check className="w-3.5 h-3.5" /> {isPending ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
            </div>

            {isAdmin && (
              <div className="border border-red-200 rounded-xl p-4 bg-red-50/50">
                <p className="text-xs font-semibold text-red-700 mb-2">Danger zone</p>
                {!showDelete ? (
                  <button
                    type="button"
                    onClick={() => setShowDelete(true)}
                    className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete this trial account
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-red-700">
                      This permanently deletes <strong>{trial.name}</strong> and its notes. This cannot be undone.
                    </p>
                    <p className="text-xs text-gray-500">
                      Type <strong>{trial.name}</strong> to confirm.
                    </p>
                    <input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={trial.name}
                      className={`${inputCls} w-full border-red-200 focus:ring-red-400`}
                    />
                    {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={confirmText !== trial.name || deletePending}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors"
                      >
                        {deletePending ? 'Deleting…' : 'Permanently delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowDelete(false); setConfirmText(''); setDeleteError(null) }}
                        className="text-xs text-gray-400 hover:text-gray-600 px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{trial.name}</h1>
                <button onClick={() => setEditing(true)} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[trial.status]}`}>{trial.status}</span>
              </div>
              {trial.trial_url && (
                <a href={trial.trial_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium border border-purple-200 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-full transition-colors flex-shrink-0">
                  <ExternalLink className="w-3 h-3" /> Open trial
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
              {trial.country && <span>{trial.country}</span>}
              {trial.sales_spoc && <><span className="text-gray-300">·</span><span>Sales: {trial.sales_spoc}</span></>}
              {trial.company_size && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TICKET_SIZE_COLOR[trial.company_size] ?? ''}`}>
                    {trial.company_size}
                  </span>
                </>
              )}
              {days != null && <><span className="text-gray-300">·</span><span>{days}d in trial</span></>}
              {trial.trial_end_date && <><span className="text-gray-300">·</span><span>Target: {formatDate(trial.trial_end_date)}</span></>}
            </div>
            {trial.modules && trial.modules.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                {trial.modules.map((m) => (
                  <span key={m} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Use case for client */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Use case for client</p>
        <textarea
          value={useCaseNotes}
          onChange={(e) => setUseCaseNotes(e.target.value)}
          onBlur={() => { if (useCaseNotes !== (trial.use_case_notes ?? '')) saveUseCaseNotes() }}
          placeholder="What use case are you demoing to this client during the trial?"
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none placeholder-gray-400 bg-white"
        />
        {savingUseCase && <p className="text-[11px] text-gray-400 mt-1">Saving…</p>}
      </div>

      {/* Status + convert */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status</p>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              disabled={isPending}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                trial.status === s ? STATUS_COLOR[s] + ' ring-1 ring-offset-1 ring-purple-400' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {trial.status === 'Converted' && trial.converted_client_id ? (
          <Link href={`/clients/${trial.converted_client_id}`} className="flex items-center gap-1.5 text-sm text-green-700 font-medium hover:underline w-fit">
            View implementation client <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <Link
            href={`/clients/new?fromTrial=${trial.id}`}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors w-fit"
          >
            Convert to Implementation <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Notes</h3>
        </div>
        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {notes.length === 0 && <p className="text-xs text-gray-400 text-center py-5">No notes logged yet.</p>}
          {notes.map((n) => (
            <NoteRow
              key={n.id}
              note={n}
              currentUserId={currentUserId}
              onDelete={() => deleteNote(n.id)}
              onToggleDeadline={(done) => toggleDeadline(n.id, done)}
            />
          ))}
        </div>
        <div className="p-3 border-t border-gray-100 space-y-2">
          <MentionTextarea
            value={content}
            onChange={setContent}
            members={members}
            mentionedIds={mentionedIds}
            onMentionedIdsChange={setMentionedIds}
            placeholder="Log a note… type @ to tag someone"
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none placeholder-gray-400 bg-white"
          />
          {showDeadline ? (
            <div className="flex items-center gap-2">
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500" />
              <button onClick={() => { setShowDeadline(false); setDeadline('') }} className="text-gray-300 hover:text-gray-500"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button onClick={() => setShowDeadline(true)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <CalendarClock className="w-3.5 h-3.5" /> Add deadline / reminder
            </button>
          )}
          <div className="flex justify-end">
            <button
              onClick={postNote}
              disabled={isPending || !content.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> {isPending ? 'Posting…' : 'Post note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
