'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X, Plus, Trash2 } from 'lucide-react'
import {
  addConfigOptionAction,
  updateConfigOptionAction,
  deleteConfigOptionAction,
} from './actions'
import type { ConfigOption } from '@/lib/types'

const SECTION_LABELS: Record<string, string> = {
  sales_spoc: 'Sales SPOC',
  country: 'Country',
  module: 'Modules',
  kam: 'KAM',
}

function OptionRow({ opt, onDelete }: { opt: ConfigOption; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel]     = useState(opt.label)
  const [isPending, start]    = useTransition()
  const [confirming, setConfirming] = useState(false)

  function save() {
    if (!label.trim() || label.trim() === opt.label) { setEditing(false); return }
    start(async () => {
      await updateConfigOptionAction(opt.id, label.trim())
      setEditing(false)
    })
  }

  function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    start(async () => {
      await deleteConfigOptionAction(opt.id)
      onDelete()
    })
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2">
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setLabel(opt.label); setEditing(false) } }}
          className="flex-1 text-sm border border-blue-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button onClick={save} disabled={isPending} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={() => { setLabel(opt.label); setEditing(false) }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-2 group">
      <span className="flex-1 text-sm text-gray-700">{opt.label}</span>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
          confirming
            ? 'opacity-100 text-red-600 hover:bg-red-50'
            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
        }`}
        title={confirming ? 'Click again to confirm' : 'Delete'}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      {confirming && (
        <button
          onClick={() => setConfirming(false)}
          className="opacity-100 p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

function AddOption({ configKey }: { configKey: string }) {
  const [adding, setAdding]   = useState(false)
  const [label, setLabel]     = useState('')
  const [isPending, start]    = useTransition()

  function save() {
    if (!label.trim()) return
    start(async () => {
      await addConfigOptionAction(configKey, label.trim())
      setLabel('')
      setAdding(false)
    })
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium py-1.5 mt-1"
      >
        <Plus className="w-3.5 h-3.5" /> Add option
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 py-2 mt-1">
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setLabel(''); setAdding(false) } }}
        placeholder="New option…"
        className="flex-1 text-sm border border-blue-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button onClick={save} disabled={isPending || !label.trim()} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-40 transition-colors">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={() => { setLabel(''); setAdding(false) }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

interface Props {
  initialOptions: ConfigOption[]
}

export default function ConfigOptionsEditor({ initialOptions }: Props) {
  const [options, setOptions] = useState(initialOptions)

  const groups = Object.keys(SECTION_LABELS).map((key) => ({
    key,
    label: SECTION_LABELS[key],
    opts: options.filter((o) => o.config_key === key),
  }))

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.key}>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">{group.label}</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 divide-y divide-gray-100">
            {group.opts.length === 0 && (
              <p className="text-xs text-gray-400 py-3">No options yet.</p>
            )}
            {group.opts.map((opt) => (
              <OptionRow
                key={opt.id}
                opt={opt}
                onDelete={() => setOptions((prev) => prev.filter((o) => o.id !== opt.id))}
              />
            ))}
            <div className="py-1">
              <AddOption configKey={group.key} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
