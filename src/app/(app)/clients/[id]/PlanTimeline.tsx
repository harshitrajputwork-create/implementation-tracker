'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import type { PlanStep, StepStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { updateStepAction, updateStepNotesAction, updateStepConfigAction } from './actions'
import {
  CheckCircle2, Circle, Clock, ChevronDown, ChevronUp, List, BarChart2,
  Pencil, Check, X, Minus, Plus,
} from 'lucide-react'

// ── helpers ────────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split('T')[0] }

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
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d
}

function fmtShort(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function stepDateRange(kickoff: string, range: string): string {
  const { startDay, endDay } = parseDayRange(range)
  const s = fmtShort(addDays(kickoff, startDay - 1))
  const e = fmtShort(addDays(kickoff, endDay - 1))
  return startDay === endDay ? s : `${s} – ${e}`
}

function calcDeviation(kickoff: string, range: string, realDate: string): number {
  const { endDay } = parseDayRange(range)
  const ideal = addDays(kickoff, endDay - 1).getTime()
  const actual = new Date(realDate + 'T00:00:00').getTime()
  return Math.round((actual - ideal) / 86_400_000)
}

// ── status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<StepStatus, { icon: React.ElementType; color: string; label: string }> = {
  not_started: { icon: Circle,       color: 'text-gray-300', label: 'Not started' },
  in_progress: { icon: Clock,        color: 'text-blue-500', label: 'In progress' },
  done:        { icon: CheckCircle2, color: 'text-green-500', label: 'Done' },
}

function DeviationBadge({ days }: { days: number }) {
  if (days === 0)  return <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">On time</span>
  if (days > 0)    return <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">+{days}d late</span>
  return              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{Math.abs(days)}d early</span>
}

// ── step row (Steps view) ─────────────────────────────────────────────────────

function StepRow({
  step, clientId, canEdit, kickoffDate,
}: {
  step: PlanStep; clientId: string; canEdit: boolean; kickoffDate: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [showMarkDone, setShowMarkDone] = useState(false)
  const [expanded, setExpanded]         = useState(false)
  const [editing, setEditing]           = useState(false)
  const [dateInput, setDateInput] = useState(step.real_date_completed ?? today())
  const [notesInput, setNotesInput] = useState(step.notes ?? '')
  const [saveState, setSaveState]   = useState<'idle' | 'saving' | 'saved'>('idle')
  const [clientVisibleNote, setClientVisibleNote] = useState(step.notes_client_visible ?? false)
  // editable config
  const [editName, setEditName]   = useState(step.step_name)
  const [editRange, setEditRange] = useState(step.ideated_day_range)

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
      not_started: 'in_progress', in_progress: 'done', done: 'not_started',
    }
    startTransition(() => {
      updateStepAction(step.id, clientId, next[step.status], next[step.status] === 'done' ? dateInput : undefined)
    })
  }

  function confirmMarkDone() {
    setShowMarkDone(false)
    startTransition(() => { updateStepAction(step.id, clientId, 'done', dateInput) })
  }

  function undoDone() {
    startTransition(() => { updateStepAction(step.id, clientId, 'not_started') })
  }

  async function saveNotes() {
    setSaveState('saving')
    await updateStepNotesAction(step.id, clientId, notesInput, clientVisibleNote)
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }

  function saveConfig() {
    if (!editName.trim() || !editRange.trim()) return
    setEditing(false)
    startTransition(() => { updateStepConfigAction(step.id, clientId, editName, editRange) })
  }

  return (
    <div className={cn(
      'border-b border-gray-100 last:border-b-0 transition-colors',
      step.status === 'done'        && 'bg-green-50/40',
      step.status === 'in_progress' && 'bg-blue-50/40',
    )}>
      {/* main row */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          onClick={cycleStatus}
          disabled={!canEdit || isPending}
          title={canEdit ? 'Click to cycle status' : cfg.label}
          className={cn('flex-shrink-0 transition-opacity', canEdit ? 'cursor-pointer hover:opacity-70' : 'cursor-default', isPending && 'opacity-40')}
        >
          <Icon className={cn('w-5 h-5', cfg.color)} />
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-sm border border-blue-300 rounded-md px-2 py-1 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 w-48"
                placeholder="Step name"
              />
              <input
                value={editRange}
                onChange={(e) => setEditRange(e.target.value)}
                className="text-xs border border-blue-300 rounded-md px-2 py-1 text-gray-600 font-mono w-24 focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="D1 or D2-D5"
              />
              <button onClick={saveConfig} disabled={isPending} className="text-green-600 hover:text-green-700">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditing(false); setEditName(step.step_name); setEditRange(step.ideated_day_range) }} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className={cn('font-medium text-sm', step.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900')}>
                {step.step_name}
              </span>
              <span className="text-xs font-mono text-gray-400">{step.ideated_day_range}</span>
              {dateLabel && <span className="text-xs text-gray-400">· {dateLabel}</span>}
            </div>
          )}
          {step.status === 'done' && step.real_date_completed && !editing && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-green-600">Done {fmtShort(new Date(step.real_date_completed + 'T00:00:00'))}</span>
              {deviation !== null && <DeviationBadge days={deviation} />}
            </div>
          )}
          {step.status === 'in_progress' && !editing && (
            <p className="text-xs text-blue-600 mt-0.5 font-medium">In progress</p>
          )}
        </div>

        {/* edit config (admin only) */}
        {canEdit && !editing && !showMarkDone && (
          <button onClick={() => { setEditing(true); setExpanded(false); setShowMarkDone(false) }} title="Edit step name / day range" className="text-gray-300 hover:text-gray-500 flex-shrink-0">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Mark done CTA */}
        {canEdit && step.status !== 'done' && !showMarkDone && !editing && (
          <button
            onClick={() => { setShowMarkDone(true); setExpanded(false) }}
            disabled={isPending}
            className="flex-shrink-0 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            Mark done
          </button>
        )}

        {canEdit && step.status === 'done' && !editing && (
          <button onClick={undoDone} disabled={isPending} className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40">
            Undo
          </button>
        )}

        {!editing && (
          <button onClick={() => { setExpanded((v) => !v); setShowMarkDone(false) }} className="text-gray-400 hover:text-gray-600 flex-shrink-0" title="Notes">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Mark done panel */}
      {showMarkDone && canEdit && (
        <div className="px-14 pb-4 flex items-center gap-3 flex-wrap">
          <label className="text-xs text-gray-500 font-medium">Completion date</label>
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
          <button onClick={confirmMarkDone} disabled={isPending} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-40">
            Confirm done
          </button>
          <button onClick={() => setShowMarkDone(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
        </div>
      )}

      {/* Notes panel */}
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
                    saveState === 'saved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  )}
                >
                  {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : 'Save'}
                </button>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={clientVisibleNote}
                  onChange={(e) => setClientVisibleNote(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Show in Client Update export
              </label>
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

const MIN_COL = 20
const MAX_COL = 64

function GanttChart({
  steps, kickoffDate, clientId, canEdit,
}: {
  steps: PlanStep[]; kickoffDate: string | null; clientId: string; canEdit: boolean
}) {
  // Dynamic plan length based on actual steps (min 30, rounds up to nearest 5)
  const planDays = steps.length
    ? Math.ceil(Math.max(30, ...steps.map((s) => parseDayRange(s.ideated_day_range).endDay)) / 5) * 5
    : 30

  const [colWidth, setColWidth]   = useState(24)
  const [fitCol, setFitCol]       = useState(24)
  const [activeId, setActiveId]   = useState<string | null>(null)
  const [doneDate, setDoneDate]   = useState(today())
  const [isPending, startTransition] = useTransition()
  const wrapperRef    = useRef<HTMLDivElement>(null)
  const userZoomedRef = useRef(false)
  const fitColRef     = useRef(24)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      const available = entry.contentRect.width - 180 - 16
      const fit = Math.max(MIN_COL, Math.min(MAX_COL, Math.floor(available / planDays)))
      fitColRef.current = fit
      setFitCol(fit)
      if (!userZoomedRef.current) {
        setColWidth(fit)
      } else {
        setColWidth((w) => Math.max(fit, w))
      }
    })
    observer.observe(el)

    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return
      e.preventDefault()
      setColWidth((w) => {
        const next = Math.max(fitColRef.current, Math.min(MAX_COL, w - Math.sign(e.deltaY) * 2))
        userZoomedRef.current = next > fitColRef.current
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      observer.disconnect()
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  const sorted = [...steps].sort((a, b) => a.step_order - b.step_order)
  const totalW = planDays * colWidth

  // Today line position
  const todayOffset: number | null = kickoffDate ? (() => {
    const dayNum = Math.round(
      (Date.now() - new Date(kickoffDate + 'T00:00:00').getTime()) / 86_400_000,
    )
    return dayNum >= 0 && dayNum < planDays ? dayNum * colWidth : null
  })() : null

  // Label density: every day when col >= 28px, else every 5
  const labelEvery = colWidth >= 28 ? 1 : 5

  function confirmMarkDone(step: PlanStep) {
    setActiveId(null)
    startTransition(() => { updateStepAction(step.id, clientId, 'done', doneDate) })
  }

  return (
    <div ref={wrapperRef}>
      {/* Zoom controls */}
      <div className="flex items-center justify-end gap-1.5 mb-3">
        <span className="text-xs text-gray-400 mr-1">Zoom</span>
        <button
          onClick={() => { userZoomedRef.current = colWidth - 4 > fitCol; setColWidth((w) => Math.max(fitCol, w - 4)) }}
          disabled={colWidth <= fitCol}
          className="w-6 h-6 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          onClick={() => { userZoomedRef.current = true; setColWidth((w) => Math.min(MAX_COL, w + 4)) }}
          disabled={colWidth >= MAX_COL}
          className="w-6 h-6 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      <div className="overflow-x-auto w-full">
        <div style={{ minWidth: 180 + totalW + 16, width: '100%' }}>

          {/* x-axis header */}
          <div className="flex mb-0">
            <div style={{ width: 180 }} className="flex-shrink-0" />
            <div className="relative" style={{ minWidth: totalW, height: 46 }}>
              {/* TODAY chip */}
              {todayOffset !== null && (
                <div className="absolute top-0 z-10" style={{ left: todayOffset, transform: 'translateX(-50%)' }}>
                  <div className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm">
                    TODAY
                  </div>
                </div>
              )}
              {/* D-labels + calendar date */}
              {Array.from({ length: planDays }, (_, i) => i + 1)
                .filter((d) => d === 1 || (d - 1) % labelEvery === 0)
                .map((d) => {
                  const calDate = kickoffDate ? addDays(kickoffDate, d - 1) : null
                  return (
                    <div key={d} className="absolute" style={{ left: (d - 1) * colWidth, top: 12 }}>
                      <div className="text-[10px] font-bold text-gray-500 leading-none">D{d}</div>
                      {calDate && (
                        <div className="text-[9px] text-gray-400 leading-none mt-0.5 whitespace-nowrap">
                          {calDate.getDate()} {calDate.toLocaleDateString('en-GB', { month: 'short' })}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Step rows */}
          <div>
            {sorted.map((step, idx) => {
              const { startDay, endDay } = parseDayRange(step.ideated_day_range)
              const barLeft  = (startDay - 1) * colWidth
              const barWidth = (endDay - startDay + 1) * colWidth
              const isDone   = step.status === 'done'
              const isActive = activeId === step.id

              let actualBarWidth = 0
              let dev: number | null = null

              if (isDone && step.real_date_completed && kickoffDate) {
                const actualDay =
                  Math.round(
                    (new Date(step.real_date_completed + 'T00:00:00').getTime() -
                      new Date(kickoffDate + 'T00:00:00').getTime()) /
                      86_400_000,
                  ) + 1
                actualBarWidth = Math.max((actualDay - startDay + 1) * colWidth, colWidth * 0.5)
                dev = calcDeviation(kickoffDate, step.ideated_day_range, step.real_date_completed)
              } else if (step.status === 'in_progress') {
                actualBarWidth = barWidth * 0.5
              }

              const barColor =
                isDone
                  ? '#22c55e'
                  : step.status === 'in_progress'
                  ? '#60a5fa'
                  : '#d1d5db'

              return (
                <div key={step.id} className="mb-0">
                  {/* Row */}
                  <div className={`flex items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`} style={{ height: 40 }}>
                    {/* Label */}
                    <div style={{ width: 180 }} className="flex-shrink-0 pr-4 text-right">
                      <div className="text-xs font-medium text-gray-700 truncate leading-tight">{step.step_name}</div>
                      <div className="text-[10px] text-gray-400">{kickoffDate ? stepDateRange(kickoffDate, step.ideated_day_range) : step.ideated_day_range}</div>
                    </div>

                    {/* Track */}
                    <div
                      className={cn(
                        'relative flex-1 overflow-visible',
                        canEdit && !isDone && 'cursor-pointer group',
                      )}
                      style={{ minWidth: totalW, height: 40 }}
                      onClick={() => {
                        if (!canEdit || isDone) return
                        setActiveId(isActive ? null : step.id)
                        setDoneDate(today())
                      }}
                    >
                      {/* Grid line for every day */}
                      {Array.from({ length: planDays + 1 }, (_, i) => i).map((i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0"
                          style={{
                            left: i * colWidth,
                            borderLeft: i % 5 === 0
                              ? '1px solid #d1d5db'
                              : '1px solid #f3f4f6',
                          }}
                        />
                      ))}

                      {/* Today vertical line */}
                      {todayOffset !== null && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                          style={{ left: todayOffset }}
                        />
                      )}

                      {/* Planned bar (faint) */}
                      <div
                        className="absolute top-[11px] h-[18px] rounded-full opacity-20"
                        style={{ left: barLeft, width: barWidth, backgroundColor: barColor }}
                      />

                      {/* Actual / progress bar */}
                      {actualBarWidth > 0 && (
                        <div
                          className="absolute top-[11px] h-[18px] rounded-full transition-all"
                          style={{ left: barLeft, width: actualBarWidth, backgroundColor: barColor }}
                        />
                      )}

                      {/* Hover hint */}
                      {canEdit && !isDone && (
                        <div className="absolute inset-0 flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ paddingLeft: barLeft }}>
                          <span className="text-[10px] text-blue-600 font-medium bg-white/90 border border-blue-100 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                            Click · pick date · mark done
                          </span>
                        </div>
                      )}

                      {/* Deviation label */}
                      {dev !== null && (
                        <span
                          className={cn(
                            'absolute text-[10px] font-semibold whitespace-nowrap top-[12px]',
                            dev === 0 ? 'text-green-700' : dev > 0 ? 'text-red-600' : 'text-blue-600',
                          )}
                          style={{ left: barLeft + Math.max(barWidth, actualBarWidth) + 4 }}
                        >
                          {dev === 0 ? '✓' : dev > 0 ? `+${dev}d` : `${dev}d`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline mark-done panel */}
                  {isActive && canEdit && (
                    <div
                      className="flex items-center gap-2 ml-[180px] px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg mb-1 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-semibold text-blue-700 truncate max-w-[140px]">
                        {step.step_name}
                      </span>
                      <label className="text-xs text-blue-600">Done on</label>
                      <input
                        type="date"
                        value={doneDate}
                        onChange={(e) => setDoneDate(e.target.value)}
                        className="text-xs border border-blue-200 rounded-md px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <button
                        onClick={() => confirmMarkDone(step)}
                        disabled={isPending}
                        className="px-3 py-1 bg-green-600 text-white rounded-md text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-40"
                      >
                        {isPending ? '…' : 'Confirm'}
                      </button>
                      <button onClick={() => setActiveId(null)} className="text-xs text-blue-400 hover:text-blue-700">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-3 text-xs text-gray-400" style={{ paddingLeft: 180 }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-2 rounded-full bg-gray-300 opacity-40" /> Planned
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-2 rounded-full bg-blue-400" /> In progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-2 rounded-full bg-green-500" /> Done
            </span>
            {canEdit && <span>· Click bar to mark done</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function PlanTimeline({
  steps, clientId, canEdit, kickoffDate,
}: {
  steps: PlanStep[]; clientId: string; canEdit: boolean; kickoffDate: string | null
}) {
  const [view, setView] = useState<'gantt' | 'steps'>('gantt')
  const sorted    = [...steps].sort((a, b) => a.step_order - b.step_order)
  const doneCount = sorted.filter((s) => s.status === 'done').length

  const planDays = sorted.length
    ? Math.ceil(Math.max(30, ...sorted.map((s) => parseDayRange(s.ideated_day_range).endDay)) / 5) * 5
    : 30

  const dateRange = kickoffDate
    ? (() => {
        const s = fmtShort(new Date(kickoffDate + 'T00:00:00'))
        const e = fmtShort(addDays(kickoffDate, planDays - 1))
        return `${s} – ${e}`
      })()
    : null

  return (
    <div>
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-baseline gap-2">
            <h2 className="font-semibold text-gray-900">{planDays}-Day Implementation Plan</h2>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              {doneCount}/{sorted.length}
            </span>
          </div>
          {dateRange && (
            <p className="text-xs text-gray-400 mt-0.5">{dateRange}</p>
          )}
        </div>

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
          style={{ width: `${(doneCount / (sorted.length || 1)) * 100}%` }}
        />
      </div>

      {view === 'gantt' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <GanttChart
            steps={sorted}
            kickoffDate={kickoffDate}
            clientId={clientId}
            canEdit={canEdit}
          />
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
          Click the circle icon to cycle status · use &ldquo;Mark done&rdquo; for explicit date · pen icon to rename step or change day range.
        </p>
      )}
    </div>
  )
}
