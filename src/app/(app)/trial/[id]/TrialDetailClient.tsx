'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ExternalLink, CalendarClock, Trash2, Send, ArrowRight, Pencil, Check, X, Download, Plus, KeyRound,
} from 'lucide-react'
import MentionTextarea from '@/components/MentionTextarea'
import { updateTrialAccountAction, addTrialNoteAction, deleteTrialNoteAction, toggleTrialNoteDeadlineDoneAction, deleteTrialAccountAction } from '../actions'
import { formatDate, daysSince, subdomainOf, downloadCsv, defaultDemoPassword } from '@/lib/utils'
import { TICKET_SIZES, TICKET_SIZE_COLOR } from '@/lib/ticket-size'
import type { TrialAccount, TrialStatus, ClientNoteEntry, ConfigOption, Profile, DemoCredential } from '@/lib/types'

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
      {note.spoke_with && (
        <p className="text-[11px] text-gray-400 mt-1">Spoke with: <span className="text-gray-600 font-medium">{note.spoke_with}</span></p>
      )}
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
  const [spokeWith, setSpokeWith] = useState('')

  const [credentials, setCredentials] = useState<DemoCredential[]>(trial.demo_credentials ?? [])
  const [columns, setColumns] = useState<string[]>(trial.demo_credential_columns ?? [])
  const [savingCredentials, setSavingCredentials] = useState(false)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')

  const spocOptions    = configOptions.filter((o) => o.config_key === 'sales_spoc')
  const countryOptions = configOptions.filter((o) => o.config_key === 'country')
  const moduleOptions  = configOptions.filter((o) => o.config_key === 'module')
  const days = daysSince(trial.trial_start_date)
  const suggestedPassword = defaultDemoPassword(trial.trial_url)

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
      await addTrialNoteAction(trial.id, content, showDeadline ? deadline || null : null, mentionedIds, spokeWith || null)
      setContent(''); setMentionedIds([]); setShowDeadline(false); setDeadline(''); setSpokeWith('')
      router.refresh()
    })
  }

  function addCredentialRow() {
    setCredentials((prev) => [...prev, { id: '', password: suggestedPassword, extra: {} }])
  }

  function fillEmptyPasswords() {
    if (!suggestedPassword) return
    const next = credentials.map((c) => (c.password.trim() ? c : { ...c, password: suggestedPassword }))
    setCredentials(next)
    saveCredentials(next)
  }

  function updateCredentialField(index: number, field: 'id' | 'password', value: string) {
    setCredentials((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  function updateCredentialExtra(index: number, column: string, value: string) {
    setCredentials((prev) => prev.map((c, i) => (i === index ? { ...c, extra: { ...c.extra, [column]: value } } : c)))
  }

  function removeCredentialRow(index: number) {
    const next = credentials.filter((_, i) => i !== index)
    setCredentials(next)
    saveCredentials(next)
  }

  // Pasting several IDs at once (e.g. "employee1@x.com\nmanager1@x.com\nhq1@x.com")
  // fans them out into one row each, instead of overwriting a single field.
  function handleIdPaste(e: React.ClipboardEvent<HTMLInputElement>, index: number) {
    const text = e.clipboardData.getData('text')
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length <= 1) return
    e.preventDefault()
    const next = [...credentials]
    next[index] = { ...next[index], id: lines[0], password: next[index].password || suggestedPassword }
    const newRows: DemoCredential[] = lines.slice(1).map((line) => ({ id: line, password: suggestedPassword, extra: {} }))
    next.splice(index + 1, 0, ...newRows)
    setCredentials(next)
    saveCredentials(next)
  }

  function saveCredentials(next: DemoCredential[] = credentials, cols: string[] = columns) {
    setSavingCredentials(true)
    start(async () => {
      await updateTrialAccountAction(trial.id, {
        demoCredentials: next.filter((c) => c.id.trim() || c.password.trim()),
        demoCredentialColumns: cols,
      })
      setSavingCredentials(false)
      router.refresh()
    })
  }

  function addColumn() {
    const name = newColumnName.trim()
    setAddingColumn(false)
    setNewColumnName('')
    if (!name || columns.includes(name)) return
    const next = [...columns, name]
    setColumns(next)
    saveCredentials(credentials, next)
  }

  function removeColumn(name: string) {
    const nextCols = columns.filter((c) => c !== name)
    const nextCreds = credentials.map((c) => {
      if (!c.extra || !(name in c.extra)) return c
      const extra = { ...c.extra }
      delete extra[name]
      return { ...c, extra }
    })
    setColumns(nextCols)
    setCredentials(nextCreds)
    saveCredentials(nextCreds, nextCols)
  }

  function exportCredentialsCsv() {
    downloadCsv(
      `${trial.name.replace(/[^a-z0-9]+/gi, '-')}-demo-logins.csv`,
      ['ID', 'One-time temporary password', ...columns],
      credentials.filter((c) => c.id.trim()).map((c) => [c.id, c.password, ...columns.map((col) => c.extra?.[col] ?? '')]),
    )
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
              <div>
                <label className="text-xs text-gray-400 block mb-1">Trial URL</label>
                <input value={trialUrl} onChange={(e) => setTrialUrl(e.target.value)} placeholder="https://account.taqtics.co/" className={`${inputCls} w-full`} />
              </div>
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
                <a href={trial.trial_url} target="_blank" rel="noopener noreferrer" title={trial.trial_url} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium border border-purple-200 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-full transition-colors flex-shrink-0">
                  <ExternalLink className="w-3 h-3" /> {subdomainOf(trial.trial_url) ?? 'Open trial'}
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
          rows={12}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y placeholder-gray-400 bg-white font-mono"
        />
        {savingUseCase && <p className="text-[11px] text-gray-400 mt-1">Saving…</p>}
      </div>

      {/* Demo credentials */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" /> Demo logins for client
          </p>
          {credentials.length > 0 && (
            <button
              onClick={exportCredentialsCsv}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
            >
              <Download className="w-3.5 h-3.5" /> Download CSV
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Dummy accounts + one-time temp passwords to hand off to the client — kept separate from your use-case notes above.
          Paste several IDs at once into an ID field (one per line) to add them all in one go.
          {suggestedPassword && <> New rows default to <span className="font-mono text-gray-600">{suggestedPassword}</span>.</>}
        </p>

        {credentials.length > 0 && (
          <div className="space-y-1.5 mb-3 overflow-x-auto">
            <div
              className="grid gap-2 items-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide min-w-max"
              style={{ gridTemplateColumns: `1.4fr 1.2fr ${columns.map(() => '1fr').join(' ')} auto` }}
            >
              <span>ID</span>
              <span>One-time temp password</span>
              {columns.map((col) => (
                <span key={col} className="flex items-center gap-1 normal-case">
                  {col}
                  <button onClick={() => removeColumn(col)} title={`Remove column "${col}"`} className="text-gray-300 hover:text-red-500">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              <span />
            </div>
            {credentials.map((c, i) => (
              <div
                key={i}
                className="grid gap-2 items-center min-w-max"
                style={{ gridTemplateColumns: `1.4fr 1.2fr ${columns.map(() => '1fr').join(' ')} auto` }}
              >
                <input
                  value={c.id}
                  onChange={(e) => updateCredentialField(i, 'id', e.target.value)}
                  onPaste={(e) => handleIdPaste(e, i)}
                  onBlur={() => saveCredentials()}
                  placeholder="employee1@angadi.com"
                  className={inputCls}
                />
                <input
                  value={c.password}
                  onChange={(e) => updateCredentialField(i, 'password', e.target.value)}
                  onBlur={() => saveCredentials()}
                  placeholder="One-time temp password"
                  className={inputCls}
                />
                {columns.map((col) => (
                  <input
                    key={col}
                    value={c.extra?.[col] ?? ''}
                    onChange={(e) => updateCredentialExtra(i, col, e.target.value)}
                    onBlur={() => saveCredentials()}
                    className={inputCls}
                  />
                ))}
                <button onClick={() => removeCredentialRow(i)} title="Remove" className="text-gray-300 hover:text-red-500 p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={addCredentialRow}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add login
          </button>
          {suggestedPassword && credentials.some((c) => !c.password.trim()) && (
            <button
              onClick={fillEmptyPasswords}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
            >
              <KeyRound className="w-3.5 h-3.5" /> Fill empty passwords
            </button>
          )}
          {addingColumn ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addColumn()
                  if (e.key === 'Escape') { setAddingColumn(false); setNewColumnName('') }
                }}
                placeholder="Column name (e.g. Store)"
                className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500 w-36"
              />
              <button onClick={addColumn} className="text-xs text-purple-600 hover:text-purple-700 font-medium">Add</button>
              <button onClick={() => { setAddingColumn(false); setNewColumnName('') }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setAddingColumn(true)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Add column
            </button>
          )}
        </div>
        {savingCredentials && <p className="text-[11px] text-gray-400 mt-1">Saving…</p>}
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
          <input
            value={spokeWith}
            onChange={(e) => setSpokeWith(e.target.value)}
            placeholder="Spoke with (optional — client contact's name)"
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-gray-400 bg-white"
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
