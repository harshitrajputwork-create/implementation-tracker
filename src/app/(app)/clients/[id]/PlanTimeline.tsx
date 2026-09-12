'use client'

import { useState, useTransition } from 'react'
import type { PlanStep, StepStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { updateStepAction, updateStepNotesAction } from './actions'
import {
  CheckCircle2, Circle, Clock, ChevronDown, ChevronUp, List, BarChart2,
} from 'lucide-react'

// ── date helpers ──────────────────────────────────────────────────────────────

function parseDayRange(range: string): { startDay: number; endDay: number } {
  const clean = range.replace(/D/g, '').replace('–', '-').replace('—', '-')
  if (clean.includes('-')) {
    const parts = clean.split('-').map((s) => parseInt(s.trim()))
    return { startDay: parts[0], endDay: parts[1] }
  }
  const day = parseInt(clean)
  return { startDay: day, endDay: day }
}

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d
}

function toStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function fmtShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function stepDateRange(kickoff: string, range: string): string {
  const { startDay, endDay } = parseDayRange(range)
  const s = fmtShort(toStr(addDays(kickoff, startDay - 1)))
  const e = fmtShort(toStr(addDays(kickoff, endDay - 1)))
  return startDay === endDay ? s : `${s} – ${e}`
}

function calcDeviation(kickoff: string, range: string, realDate: string): number {
  const { endDay } = parseDayRange(range)
  const ideal = addDays(kickoff, endDay - 1).getTime()
  const actual = new Date(realDate).getTime()
  return Math.round((actual - ideal) / 86_400_000)
}

// ── status icon config ────────────────────────────────────────────────────────

const STATUS_CFG: Record<StepStatus, { icon: React.ElementType; color: string; label: string }> = {
  not_started: { icon: Circle,       color: 'text-gray-300', label: 'Not started' },
  in_progress: { icon: Clock,        color: 'text-blue-500', label: 'In progress' },
  done:        { icon: CheckCircle2, color: 'text-green-500', label: 'Done' },
}

// ── deviation badge ───────────────────────────────────────────────────────────

function DeviationBadge({ days }: { days: number }) {
  if (days === 0)  return <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">On time</span>
  if (days > 0)    return <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">+{days}d late</span>
  return              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{Math.abs(days)}d early</span>
}

// ── single step row ───────────────────────────────────────────────────────────

function StepRow({
  step,
  clientId,
  canEdit,
  kickoffDate,
}: {
  step: PlanStep
  clientId: string
  canEdit: boolean
  kickoffDate: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [showMarkDone, setShowMarkDone]   = useState(false)
  const [expanded, setExpanded]           = useState(false)
  const [dateInput, setDateInput]         = useState(
    step.real_date_completed ?? new Date().toISOString().split('T')[0]
  )
  const [notesInput, setNotesInput] = useState(step.notes ?? '')
  const [saveState, setSaveState]   = useState<'idle' | 'saving' | 'saved'>('idle')

  const cfg  = STATUS_CFG[step.status]
  const Icon = cfg.icon

  const dateLabel = kickoffDate ? stepDateRange(kickoffDate, step.ideated_day_range) : null

  const deviation =
    step.status === 'done' && step.real_date_completed && kickoffDate
      ? calcDeviation(kickoffDate, step.ideated_day_range, step.real_date_completed)
      : null

  function cycleStatus() {
    if (!canEdit) return
    const next: Record<StepStatus, StepStatus> = {
      not_started: 'in_progress',
      in_progress: 'done',
      done: 'not_started',
    }
    const newStatus = next[step.status]
    startTransition(() => {
      updateStepAction(step.id, clientId, newStatus, newStatus === 'done' ? dateInput : undefined)
    })
  }

  function confirmMarkDone() {
    setShowMarkDone(false)
    startTransition(() => {
      updateStepAction(step.id, clientId, 'done', dateInput)
    })
  }

  function undoDone() {
    startTransition(() => {
      updateStepAction(step.id, clientId, 'not_started', undefined)
    })
  }

  async function saveNotes() {
    setSaveState('saving')
    await updateStepNotesAction(step.id, clientId, notesInput)
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }

  return (
    <div className={cn(
      'border-b border-gray-100 last:border-b-0 transition-colors',
      step.status === 'done'        && 'bg-green-50/40',
      step.status === 'in_progress' && 'bg-blue-50/40',
    )}>
      {/* ── main row ── */}
      <div className="flex items-center gap-3 px-5 py-4">
        {/* status icon — click to cycle (secondary) */}
        <button
          onClick={cycleStatus}
          disabled={!canEdit || isPending}
          title={canEdit ? 'Click to cycle status' : cfg.label}
          className={cn(
            'flex-shrink-0 transition-opacity',
            canEdit ? 'cursor-pointer hover:opacity-70' : 'cursor-default',
            isPending && 'opacity-40',
          )}
        >
          <Icon className={cn('w-5 h-5', cfg.color)} />
        </button>

        {/* step info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={cn(
              'font-medium text-sm',
              step.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900',
            )}>
              {step.step_name}
            </span>
            <span className="text-xs font-mono text-gray-400">{step.ideated_day_range}</span>
            {dateLabel && (
              <span className="text-xs text-gray-400">· {dateLabel}</span>
            )}
          </div>

          {/* status sub-line */}
          {step.status === 'done' && step.real_date_completed && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-green-600">
                Done {fmtShort(step.real_date_completed)}
              </span>
              {deviation !== null && <DeviationBadge days={deviation} />}
            </div>
          )}
          {step.status === 'in_progress' && (
            <p className="text-xs text-blue-600 mt-0.5 font-medium">In progress</p>
          )}
        </div>

        {/* primary CTA: Mark done */}
        {canEdit && step.status !== 'done' && !showMarkDone && (
          <button
            onClick={() => { setShowMarkDone(true); setExpanded(false) }}
            disabled={isPending}
            className="flex-shrink-0 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            Mark done
          </button>
        )}

        {/* undo if done */}
        {canEdit && step.status === 'done' && (
          <button
            onClick={undoDone}
            disabled={isPending}
            className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
          >
            Undo
          </button>
        )}

        {/* notes toggle */}
        <button
          onClick={() => { setExpanded((v) => !v); setShowMarkDone(false) }}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          title="Notes"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* ── mark done inline panel ── */}
      {showMarkDone && canEdit && (
        <div className="px-14 pb-4 flex items-center gap-3 flex-wrap">
          <label className="text-xs text-gray-500 font-medium">Completion date</label>
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
          <button
            onClick={confirmMarkDone}
            disabled={isPending}
            className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-40"
          >
            Confirm done
          </button>
          <button
            onClick={() => setShowMarkDone(false)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── notes expanded panel ── */}
      {expanded && (
        <div className="px-14 pb-4 space-y-3">
          {step.description && (
            <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
          )}
          {canEdit ? (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
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
                  disabled={saveState === 'saving'}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs font-medium transition-colors self-end',
                    saveState === 'saved'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  )}
                >
                  {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            step.notes && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{step.notes}</p>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ── gantt chart ───────────────────────────────────────────────────────────────

const TOTAL_DAYS = 30

function GanttChart({
  steps,
  kickoffDate,
}: {
  steps: PlanStep[]
  kickoffDate: string | null
}) {
  const sorted = [...steps].sort((a, b) => a.step_order - b.step_order)

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* header row */}
        <div className="flex items-end mb-1">
          <div className="w-44 flex-shrink-0" />
          <div className="flex-1 relative h-5">
            {[1, 5, 10, 15, 20, 25, 30].map((d) => (
              <span
                key={d}
                className="absolute text-xs text-gray-400 -translate-x-1/2"
                style={{ left: `${((d - 1) / TOTAL_DAYS) * 100}%` }}
              >
                D{d}
              </span>
            ))}
          </div>
        </div>

        {/* step rows */}
        <div className="space-y-1.5">
          {sorted.map((step) => {
            const { startDay, endDay } = parseDayRange(step.ideated_day_range)
            const leftPct  = ((startDay - 1) / TOTAL_DAYS) * 100
            const widthPct = ((endDay - startDay + 1) / TOTAL_DAYS) * 100

            // actual completion day offset from kickoff
            let actualLeftPct: number | null = null
            let dev: number | null = null
            if (step.status === 'done' && step.real_date_completed && kickoffDate) {
              const actualDay =
                Math.round(
                  (new Date(step.real_date_completed).getTime() - new Date(kickoffDate).getTime()) /
                    86_400_000,
                ) + 1
              actualLeftPct = Math.min(((actualDay - 1) / TOTAL_DAYS) * 100, 100)
              dev = calcDeviation(kickoffDate, step.ideated_day_range, step.real_date_completed)
            }

            const barColor =
              step.status === 'done'        ? 'bg-green-500' :
              step.status === 'in_progress' ? 'bg-blue-400'  : 'bg-gray-300'

            return (
              <div key={step.id} className="flex items-center gap-2">
                {/* label */}
                <div className="w-44 flex-shrink-0 pr-3 text-right">
                  <div className="text-xs font-medium text-gray-700 truncate leading-tight">
                    {step.step_name}
                  </div>
                  {kickoffDate && (
                    <div className="text-xs text-gray-400">
                      {stepDateRange(kickoffDate, step.ideated_day_range)}
                    </div>
                  )}
                </div>

                {/* bar track */}
                <div className="flex-1 relative h-7 bg-gray-50 rounded-md overflow-hidden">
                  {/* grid lines */}
                  {[5, 10, 15, 20, 25].map((d) => (
                    <div
                      key={d}
                      className="absolute top-0 bottom-0 border-l border-gray-200"
                      style={{ left: `${(d / TOTAL_DAYS) * 100}%` }}
                    />
                  ))}

                  {/* planned bar (faint) */}
                  <div
                    className={cn('absolute top-1.5 h-4 rounded-full opacity-25', barColor)}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  />

                  {/* solid bar */}
                  <div
                    className={cn('absolute top-1.5 h-4 rounded-full', barColor)}
                    style={{
                      left: `${leftPct}%`,
                      width:
                        step.status === 'done' && actualLeftPct !== null
                          ? `${Math.max(actualLeftPct - leftPct + (widthPct / (endDay - startDay + 1 || 1)), 0.5)}%`
                          : step.status === 'in_progress'
                          ? `${widthPct * 0.5}%`
                          : '0%',
                    }}
                  />

                  {/* deviation label */}
                  {dev !== null && (
                    <span
                      className={cn(
                        'absolute top-1.5 leading-4 text-xs font-semibold whitespace-nowrap px-1',
                        dev === 0 ? 'text-green-700' : dev > 0 ? 'text-red-600' : 'text-blue-600',
                      )}
                      style={{ left: `calc(${leftPct + widthPct}% + 4px)` }}
                    >
                      {dev === 0 ? '✓' : dev > 0 ? `+${dev}d` : `${dev}d`}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* legend */}
        <div className="flex items-center gap-5 mt-4 pl-44 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-full bg-gray-300 opacity-40" /> Planned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-full bg-blue-400" /> In progress
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-full bg-green-500" /> Done
          </span>
        </div>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function PlanTimeline({
  steps,
  clientId,
  canEdit,
  kickoffDate,
}: {
  steps: PlanStep[]
  clientId: string
  canEdit: boolean
  kickoffDate: string | null
}) {
  const [view, setView] = useState<'steps' | 'gantt'>('gantt')
  const sorted    = [...steps].sort((a, b) => a.step_order - b.step_order)
  const doneCount = sorted.filter((s) => s.status === 'done').length

  return (
    <div>
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-gray-900">30-Day Implementation Plan</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {doneCount} / {sorted.length} steps done
            {kickoffDate && (
              <> · Kickoff {new Date(kickoffDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
            )}
          </p>
        </div>

        {/* view toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('gantt')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              view === 'gantt' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Gantt
          </button>
          <button
            onClick={() => setView('steps')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              view === 'steps' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <List className="w-3.5 h-3.5" />
            Steps
          </button>
        </div>
      </div>

      {/* progress bar */}
      <div className="h-1.5 bg-gray-200 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${(doneCount / sorted.length) * 100}%` }}
        />
      </div>

      {/* view */}
      {view === 'gantt' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <GanttChart steps={sorted} kickoffDate={kickoffDate} />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {sorted.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              clientId={clientId}
              canEdit={canEdit}
              kickoffDate={kickoffDate}
            />
          ))}
        </div>
      )}

      {canEdit && view === 'steps' && (
        <p className="text-xs text-gray-400 mt-2">
          Click the circle icon to cycle status, or use &ldquo;Mark done&rdquo; for the primary action.
        </p>
      )}
    </div>
  )
}
