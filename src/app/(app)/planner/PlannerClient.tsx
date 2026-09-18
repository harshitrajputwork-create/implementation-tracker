'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Check, ArrowUpDown, Flag, CalendarClock, X, Pencil, ExternalLink, MessageSquareText } from 'lucide-react'
import { addPlannerTaskAction, updatePlannerTaskAction, togglePlannerTaskAction, deletePlannerTaskAction } from './actions'
import { toggleNoteDeadlineDoneAction } from '../clients/[id]/actions'
import { formatDate, daysSince } from '@/lib/utils'
import { resolveAccount, type ClientOption } from '@/lib/planner-utils'
import type { PlannerTask, TaskPriority } from '@/lib/types'

const PRIORITIES: TaskPriority[] = ['Urgent', 'High', 'Medium', 'Low']
const PRIORITY_RANK: Record<TaskPriority, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 }
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  Urgent: 'bg-red-100 text-red-700 border-red-200',
  High:   'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low:    'bg-gray-100 text-gray-600 border-gray-200',
}

interface NoteDeadline {
  id: string
  clientId: string
  clientName: string
  content: string
  deadline: string
  deadline_done: boolean
}

interface LatestUpdate {
  id: string
  clientId: string
  clientName: string
  content: string
  authorName: string
  createdAt: string
}

interface Props {
  initialTasks: PlannerTask[]
  clients: ClientOption[]
  noteDeadlines: NoteDeadline[]
  latestUpdates: LatestUpdate[]
  teamSuggestions: string[]
  personSuggestions: string[]
  accountSuggestions: string[]
}

const inputCls = 'text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white'

function relativeDay(dateStr: string): string {
  const d = daysSince(dateStr)
  if (d === null) return ''
  if (d <= 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 30) return `${d}d ago`
  return formatDate(dateStr)
}

export default function PlannerClient({
  initialTasks, clients, noteDeadlines: initialNoteDeadlines, latestUpdates, teamSuggestions, personSuggestions, accountSuggestions,
}: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [noteDeadlines, setNoteDeadlines] = useState(initialNoteDeadlines)
  const [sortMode, setSortMode] = useState<'manual' | 'deadline' | 'priority'>('manual')
  const [showDone, setShowDone] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  // Quick-add form
  const [team, setTeam] = useState('')
  const [person, setPerson] = useState('')
  const [account, setAccount] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('Medium')
  const [deadline, setDeadline] = useState('')
  const [task, setTask] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)

  const sorted = useMemo(() => {
    const list = [...tasks].filter((t) => showDone || t.status !== 'done')
    if (sortMode === 'deadline') {
      return list.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return a.deadline.localeCompare(b.deadline)
      })
    }
    if (sortMode === 'priority') {
      return list.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    }
    return list
  }, [tasks, sortMode, showDone])

  function addTask() {
    if (!task.trim()) return
    const { clientId, accountName } = resolveAccount(account, clients)
    const tempId = `temp-${Date.now()}`
    const optimistic: PlannerTask = {
      id: tempId,
      user_id: '', team: team.trim() || null, person: person.trim() || null,
      client_id: clientId, account_name: accountName, task: task.trim(), priority, deadline: deadline || null,
      status: 'open', sort_order: 0, created_at: new Date().toISOString(),
    }
    setTasks((prev) => [optimistic, ...prev])
    setAddError(null)
    start(async () => {
      const result = await addPlannerTaskAction({ team, person, clientId, accountName, task, priority, deadline: deadline || null })
      if (result?.error) {
        setTasks((prev) => prev.filter((t) => t.id !== tempId))
        setAddError(result.error)
      }
    })
    setTeam(''); setPerson(''); setAccount(''); setPriority('Medium'); setDeadline(''); setTask('')
  }

  function toggleDone(t: PlannerTask) {
    const done = t.status !== 'done'
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: done ? 'done' : 'open' } : x)))
    start(async () => { await togglePlannerTaskAction(t.id, done) })
  }

  function remove(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    start(async () => { await deletePlannerTaskAction(id) })
  }

  function toggleNoteDone(n: NoteDeadline) {
    setNoteDeadlines((prev) => prev.map((x) => (x.id === n.id ? { ...x, deadline_done: !x.deadline_done } : x)))
    start(async () => { await toggleNoteDeadlineDoneAction(n.id, n.clientId, !n.deadline_done) })
  }

  const openCount = tasks.filter((t) => t.status !== 'done').length

  return (
    <div className="space-y-6">
      <datalist id="planner-team-options">
        {teamSuggestions.map((t) => <option key={t} value={t} />)}
      </datalist>
      <datalist id="planner-person-options">
        {personSuggestions.map((p) => <option key={p} value={p} />)}
      </datalist>
      <datalist id="planner-account-options">
        {accountSuggestions.map((a) => <option key={a} value={a} />)}
      </datalist>

      {/* Quick add */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add a task</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2">
          <input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Team" list="planner-team-options" className={inputCls} />
          <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Person" list="planner-person-options" className={inputCls} />
          <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Account (any name)" list="planner-account-options" className={inputCls} />
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputCls}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
          <button
            onClick={addTask}
            disabled={isPending || !task.trim()}
            className="flex items-center justify-center gap-1 bg-blue-600 text-white text-sm font-semibold rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTask() }}
          placeholder="What needs to happen?"
          className={`${inputCls} w-full`}
        />
        {addError && (
          <p className="text-xs text-red-600 mt-2">Not saved — {addError}</p>
        )}
      </div>

      {/* Sort + filter bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> Sort:</span>
        <button
          onClick={() => setSortMode('deadline')}
          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${sortMode === 'deadline' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
        >
          <CalendarClock className="w-3 h-3" /> Deadline
        </button>
        <button
          onClick={() => setSortMode('priority')}
          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${sortMode === 'priority' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
        >
          <Flag className="w-3 h-3" /> Priority
        </button>
        {sortMode !== 'manual' && (
          <button onClick={() => setSortMode('manual')} className="text-xs text-gray-400 hover:text-gray-600">Reset</button>
        )}
        <label className="flex items-center gap-1.5 text-xs text-gray-400 ml-auto cursor-pointer">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="rounded border-gray-300" />
          Show done
        </label>
      </div>

      {/* Task list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">My tasks</h3>
          <span className="text-xs text-gray-400">{openCount} open</span>
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Nothing here yet — add your first task above.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {sorted.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                clients={clients}
                editing={editingId === t.id}
                onEdit={() => setEditingId(t.id)}
                onCancelEdit={() => setEditingId(null)}
                onSaved={(fields) => {
                  const previous = t
                  setTasks((prev) => prev.map((x) => (x.id === t.id
                    ? { ...x, ...fields, client_id: fields.clientId ?? null, account_name: fields.accountName ?? null }
                    : x)))
                  setAddError(null)
                  start(async () => {
                    const result = await updatePlannerTaskAction(t.id, fields)
                    if (result?.error) {
                      setTasks((prev) => prev.map((x) => (x.id === t.id ? previous : x)))
                      setAddError(result.error)
                    }
                  })
                  setEditingId(null)
                }}
                onToggleDone={() => toggleDone(t)}
                onDelete={() => remove(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Where things stand — latest note per client, no deadline required */}
      {latestUpdates.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <MessageSquareText className="w-3.5 h-3.5 text-gray-400" />
              Where things stand
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">The last note logged on each account — so you don&apos;t have to remember.</p>
          </div>
          <div className="divide-y divide-gray-50">
            {latestUpdates.map((u) => (
              <div key={u.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/clients/${u.clientId}#note-${u.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                    {u.clientName}
                  </Link>
                  <span className="text-xs text-gray-400">{relativeDay(u.createdAt)} · {u.authorName}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{u.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* From client notes */}
      {noteDeadlines.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Deadlines from client notes</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {noteDeadlines.map((n) => {
              const overdue = !n.deadline_done && n.deadline < new Date().toISOString().split('T')[0]
              return (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleNoteDone(n)}
                    className={`w-4 h-4 mt-0.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${n.deadline_done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-gray-400'}`}
                  >
                    {n.deadline_done && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.deadline_done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{n.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Link href={`/clients/${n.clientId}#note-${n.id}`} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                        {n.clientName} <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                      <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {overdue ? 'Overdue' : 'Due'} {formatDate(n.deadline)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function TaskRow({
  task, clients, editing, onEdit, onCancelEdit, onSaved, onToggleDone, onDelete,
}: {
  task: PlannerTask
  clients: ClientOption[]
  editing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSaved: (fields: { team?: string | null; person?: string | null; clientId?: string | null; accountName?: string | null; task?: string; priority?: TaskPriority; deadline?: string | null }) => void
  onToggleDone: () => void
  onDelete: () => void
}) {
  const clientName = clients.find((c) => c.id === task.client_id)?.name

  const [team, setTeam] = useState(task.team ?? '')
  const [person, setPerson] = useState(task.person ?? '')
  const [account, setAccount] = useState(clientName ?? task.account_name ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [deadline, setDeadline] = useState(task.deadline ?? '')
  const [text, setText] = useState(task.task)
  const [confirmDel, setConfirmDel] = useState(false)

  const isDone = task.status === 'done'
  const overdue = task.deadline && !isDone && task.deadline < new Date().toISOString().split('T')[0]

  if (editing) {
    return (
      <div className="px-4 py-3 bg-blue-50/50">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
          <input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Team" list="planner-team-options" className={inputCls} />
          <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Person" list="planner-person-options" className={inputCls} />
          <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Account (any name)" list="planner-account-options" className={inputCls} />
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputCls}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
        </div>
        <input value={text} onChange={(e) => setText(e.target.value)} className={`${inputCls} w-full mb-2`} />
        <div className="flex gap-2">
          <button
            onClick={() => {
              const { clientId, accountName } = resolveAccount(account, clients)
              onSaved({ team, person, clientId, accountName, task: text, priority, deadline: deadline || null })
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
          >
            <Check className="w-3.5 h-3.5" /> Save
          </button>
          <button onClick={onCancelEdit} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 group">
      <button
        onClick={onToggleDone}
        className={`w-4 h-4 mt-0.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-gray-400'}`}
      >
        {isDone && <Check className="w-3 h-3 text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.task}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</span>
          {task.team && <span className="text-xs text-gray-400">· {task.team}</span>}
          {task.person && <span className="text-xs text-gray-400">· {task.person}</span>}
          {clientName ? (
            <Link href={`/clients/${task.client_id}`} className="text-xs text-blue-600 hover:text-blue-700">· {clientName}</Link>
          ) : task.account_name ? (
            <span className="text-xs text-gray-400">· {task.account_name}</span>
          ) : null}
          {task.deadline && (
            <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              · {overdue ? 'Overdue' : 'Due'} {formatDate(task.deadline)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={onEdit} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { if (!confirmDel) { setConfirmDel(true); return } onDelete() }}
          className={`p-1 rounded-md ${confirmDel ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        {confirmDel && (
          <button onClick={() => setConfirmDel(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-md">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
