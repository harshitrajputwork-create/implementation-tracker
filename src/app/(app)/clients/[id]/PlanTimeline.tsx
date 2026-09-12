'use client'

import { useState, useTransition } from 'react'
import type { PlanStep, StepStatus } from '@/lib/types'
import { formatDate, cn } from '@/lib/utils'
import { updateStepAction, updateStepNotesAction } from './actions'
import { CheckCircle2, Circle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

const stepStatusConfig: Record<StepStatus, { icon: React.ElementType; color: string; label: string }> = {
  not_started: { icon: Circle, color: 'text-gray-300', label: 'Not started' },
  in_progress: { icon: Clock, color: 'text-blue-500', label: 'In progress' },
  done: { icon: CheckCircle2, color: 'text-green-500', label: 'Done' },
}

function StepRow({
  step,
  clientId,
  canEdit,
}: {
  step: PlanStep
  clientId: string
  canEdit: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [dateInput, setDateInput] = useState(
    step.real_date_completed ?? new Date().toISOString().split('T')[0]
  )
  const [notesInput, setNotesInput] = useState(step.notes ?? '')
  const [notesSaving, setNotesSaving] = useState(false)

  const cfg = stepStatusConfig[step.status]
  const Icon = cfg.icon

  function cycleStatus() {
    if (!canEdit) return
    const next: Record<StepStatus, StepStatus> = {
      not_started: 'in_progress',
      in_progress: 'done',
      done: 'not_started',
    }
    const newStatus = next[step.status]
    startTransition(() => {
      updateStepAction(step.id, clientId, newStatus, dateInput)
    })
  }

  function saveNotes() {
    setNotesSaving(true)
    startTransition(async () => {
      await updateStepNotesAction(step.id, clientId, notesInput)
      setNotesSaving(false)
    })
  }

  return (
    <div
      className={cn(
        'border-b border-gray-100 last:border-b-0 transition-colors',
        step.status === 'done' && 'bg-green-50/40',
        step.status === 'in_progress' && 'bg-blue-50/40'
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Status icon */}
        <button
          onClick={cycleStatus}
          disabled={!canEdit || isPending}
          className={cn(
            'flex-shrink-0 transition-opacity',
            canEdit ? 'cursor-pointer hover:opacity-70' : 'cursor-default'
          )}
          title={canEdit ? 'Click to advance status' : cfg.label}
        >
          <Icon className={cn('w-6 h-6', cfg.color)} />
        </button>

        {/* Step info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400 flex-shrink-0">
              {step.ideated_day_range}
            </span>
            <span
              className={cn(
                'font-medium text-sm',
                step.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'
              )}
            >
              {step.step_name}
            </span>
          </div>
          {step.status === 'done' && step.real_date_completed && (
            <p className="text-xs text-green-600 mt-0.5">
              Completed {formatDate(step.real_date_completed)}
            </p>
          )}
          {step.status === 'in_progress' && (
            <p className="text-xs text-blue-600 mt-0.5 font-medium">In progress</p>
          )}
        </div>

        {/* Date input (visible when in_progress or marking done) */}
        {canEdit && step.status !== 'not_started' && (
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-14 pb-4 space-y-3">
          {step.description && (
            <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
          )}
          {canEdit && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Step notes
              </label>
              <div className="flex gap-2">
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  rows={2}
                  placeholder="Any notes specific to this step…"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
                <button
                  onClick={saveNotes}
                  disabled={notesSaving}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors self-end"
                >
                  {notesSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
          {!canEdit && step.notes && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              {step.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function PlanTimeline({
  steps,
  clientId,
  canEdit,
}: {
  steps: PlanStep[]
  clientId: string
  canEdit: boolean
}) {
  const sorted = [...steps].sort((a, b) => a.step_order - b.step_order)
  const doneCount = sorted.filter((s) => s.status === 'done').length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">30-Day Implementation Plan</h2>
        <span className="text-sm text-gray-500">
          {doneCount} / {sorted.length} steps done
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${(doneCount / sorted.length) * 100}%` }}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {sorted.map((step) => (
          <StepRow key={step.id} step={step} clientId={clientId} canEdit={canEdit} />
        ))}
      </div>

      {canEdit && (
        <p className="text-xs text-gray-400 mt-2">
          Click the circle icon to cycle a step: not started → in progress → done
        </p>
      )}
    </div>
  )
}
