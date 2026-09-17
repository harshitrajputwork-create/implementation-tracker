'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, ChevronDown, ChevronUp, NotebookPen, X, AlertTriangle } from 'lucide-react'
import { addPlannerTaskAction } from '../(app)/planner/actions'
import { resolveAccount, type ClientOption } from '@/lib/planner-utils'
import type { TaskPriority } from '@/lib/types'

const PRIORITIES: TaskPriority[] = ['Urgent', 'High', 'Medium', 'Low']
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  Urgent: 'bg-red-100 text-red-700 border-red-200',
  High:   'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low:    'bg-gray-100 text-gray-600 border-gray-200',
}

interface Props {
  clients: ClientOption[]
  teamSuggestions: string[]
  personSuggestions: string[]
  accountSuggestions: string[]
}

const inputCls = 'text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white w-full'

export default function QuickCapture({ clients, teamSuggestions, personSuggestions, accountSuggestions }: Props) {
  const searchParams = useSearchParams()
  const isPopup = searchParams.get('popup') === '1'

  const [task, setTask] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [team, setTeam] = useState('')
  const [person, setPerson] = useState('')
  const [account, setAccount] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('Medium')
  const [deadline, setDeadline] = useState('')
  const [savedCount, setSavedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function save() {
    if (!task.trim()) return
    const text = task.trim()
    const { clientId, accountName } = resolveAccount(account, clients)
    setError(null)
    start(async () => {
      const result = await addPlannerTaskAction({ team, person, clientId, accountName, task: text, priority, deadline: deadline || null })
      if (result?.error) {
        setError(result.error)
        return
      }
      setSavedCount((c) => c + 1)
      setTask('')
      // Keep team/person/account/priority — likely the same batch of context for the next note.
      inputRef.current?.focus()
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 pt-10 sm:pt-20">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <NotebookPen className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-bold text-gray-900">Quick Note</h1>
          </div>
          {isPopup ? (
            <button onClick={() => window.close()} title="Close" className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <Link href="/planner" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Open Planner →</Link>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <input
            ref={inputRef}
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save() }}
            placeholder="What's on your mind?"
            className={`${inputCls} text-base py-2.5`}
          />

          <button
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-2.5"
          >
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showDetails ? 'Hide details' : 'Team, account, priority, deadline…'}
          </button>

          {showDetails && (
            <div className="mt-2.5 space-y-2">
              <datalist id="qc-team">{teamSuggestions.map((t) => <option key={t} value={t} />)}</datalist>
              <datalist id="qc-person">{personSuggestions.map((p) => <option key={p} value={p} />)}</datalist>
              <datalist id="qc-account">{accountSuggestions.map((a) => <option key={a} value={a} />)}</datalist>

              <div className="grid grid-cols-2 gap-2">
                <input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Team" list="qc-team" className={inputCls} />
                <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Person" list="qc-person" className={inputCls} />
              </div>
              <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Account (any name)" list="qc-account" className={inputCls} />
              <div className="flex gap-1.5 flex-wrap">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                      priority === p ? PRIORITY_COLOR[p] : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-400">
              {savedCount > 0 && `${savedCount} saved this session`}
            </span>
            <button
              onClick={save}
              disabled={isPending || !task.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              <Check className="w-4 h-4" />
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-1.5 mt-2.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">Not saved — {error}</p>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center mt-3">Press Enter to save · goes straight to your Planner</p>
      </div>
    </div>
  )
}
