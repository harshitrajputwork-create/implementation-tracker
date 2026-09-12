'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X, Trash2, Plus, GripVertical } from 'lucide-react'
import {
  updateTemplateStepAction,
  deleteTemplateStepAction,
  addTemplateStepAction,
} from './actions'

interface TemplateStep {
  id: string
  step_order: number
  step_name: string
  ideated_day_range: string
  description: string | null
}

function StepTemplateRow({ step, onDeleted }: { step: TemplateStep; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName]       = useState(step.step_name)
  const [range, setRange]     = useState(step.ideated_day_range)
  const [desc, setDesc]       = useState(step.description ?? '')
  const [isPending, start]    = useTransition()

  function save() {
    if (!name.trim() || !range.trim()) return
    start(async () => {
      await updateTemplateStepAction(step.id, name, range, desc)
      setEditing(false)
    })
  }

  function discard() {
    setName(step.step_name)
    setRange(step.ideated_day_range)
    setDesc(step.description ?? '')
    setEditing(false)
  }

  function remove() {
    if (!confirm(`Delete step "${step.step_name}"? This only affects future clients.`)) return
    start(async () => {
      await deleteTemplateStepAction(step.id)
      onDeleted()
    })
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      {editing ? (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Step name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="w-28">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Day range</label>
              <input
                value={range}
                onChange={(e) => setRange(e.target.value)}
                placeholder="D1 or D2-D5"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Description (optional)</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={isPending || !name.trim() || !range.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Save
            </button>
            <button onClick={discard} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors">
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <GripVertical className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
          <div className="flex-shrink-0 w-16">
            <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {step.ideated_day_range}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{step.step_name}</p>
            {step.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{step.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit step"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={remove}
              disabled={isPending}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
              title="Delete step"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddStepRow({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen]    = useState(false)
  const [name, setName]    = useState('')
  const [range, setRange]  = useState('')
  const [desc, setDesc]    = useState('')
  const [isPending, start] = useTransition()

  function add() {
    if (!name.trim() || !range.trim()) return
    start(async () => {
      await addTemplateStepAction(name, range, desc)
      setName(''); setRange(''); setDesc(''); setOpen(false)
      onAdded()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-600 transition-colors w-full"
      >
        <Plus className="w-4 h-4" />
        Add step
      </button>
    )
  }

  return (
    <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50/40 space-y-3">
      <p className="text-sm font-semibold text-gray-700">New step</p>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Step name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Client sign-off"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            autoFocus
          />
        </div>
        <div className="w-28">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Day range</label>
          <input
            value={range}
            onChange={(e) => setRange(e.target.value)}
            placeholder="D1 or D2-D5"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono bg-white"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Description (optional)</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          placeholder="What happens in this step…"
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-600"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={add}
          disabled={isPending || !name.trim() || !range.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add step
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function ConfigEditor({ initialSteps }: { initialSteps: TemplateStep[] }) {
  const [steps, setSteps] = useState(initialSteps)

  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <StepTemplateRow
          key={step.id}
          step={step}
          onDeleted={() => setSteps((s) => s.filter((r) => r.id !== step.id))}
        />
      ))}
      <AddStepRow onAdded={() => {}} />
    </div>
  )
}
