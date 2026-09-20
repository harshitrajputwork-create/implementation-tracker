'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, Check, Mail, ChevronDown, ChevronUp } from 'lucide-react'
import { addSpocAction, updateSpocAction, deleteSpocAction } from './actions'
import type { ClientSpoc } from '@/lib/types'

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

const DEPT_COLORS: Record<string, string> = {
  IT: 'bg-blue-100 text-blue-700',
  Operations: 'bg-green-100 text-green-700',
  Finance: 'bg-amber-100 text-amber-700',
  HR: 'bg-purple-100 text-purple-700',
  Marketing: 'bg-pink-100 text-pink-700',
  Procurement: 'bg-orange-100 text-orange-700',
}
function deptColor(dept: string) {
  return DEPT_COLORS[dept] ?? 'bg-gray-100 text-gray-600'
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'

interface SpocFormProps {
  initial?: ClientSpoc
  onSave: (fields: { name: string; email: string; department: string; notes: string }) => void
  onCancel: () => void
  isPending: boolean
}

function SpocForm({ initial, onSave, onCancel, isPending }: SpocFormProps) {
  const [name, setName]   = useState(initial?.name ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [dept, setDept]   = useState(initial?.department ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name *"
        className={inputCls}
      />
      <div className="grid grid-cols-2 gap-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputCls} />
        <input value={dept}  onChange={(e) => setDept(e.target.value)}  placeholder="Department" className={inputCls} />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes about this person…"
        rows={2}
        className={`${inputCls} resize-none`}
      />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={() => { if (name.trim()) onSave({ name, email, department: dept, notes }) }}
          disabled={isPending || !name.trim()}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

interface Props {
  spocs: ClientSpoc[]
  clientId: string
  canEdit: boolean
}

export default function ClientSpocs({ spocs: initial, clientId, canEdit }: Props) {
  const [spocs, setSpocs]       = useState(initial)
  useEffect(() => { setSpocs(initial) }, [initial])
  const [adding, setAdding]     = useState(false)
  const [editingId, setEditing] = useState<string | null>(null)
  const [expandedId, setExpanded] = useState<string | null>(null)
  const [confirmDel, setConfirm]  = useState<string | null>(null)
  const [isPending, start]      = useTransition()

  function handleAdd(fields: { name: string; email: string; department: string; notes: string }) {
    start(async () => {
      await addSpocAction(clientId, fields)
      setAdding(false)
    })
  }

  function handleUpdate(id: string, fields: { name: string; email: string; department: string; notes: string }) {
    start(async () => {
      await updateSpocAction(id, clientId, fields)
      setEditing(null)
    })
  }

  function handleDelete(id: string) {
    if (confirmDel !== id) { setConfirm(id); return }
    start(async () => {
      await deleteSpocAction(id, clientId)
      setSpocs((prev) => prev.filter((s) => s.id !== id))
      setConfirm(null)
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Client Contacts</h3>
        {canEdit && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        {spocs.length === 0 && !adding && (
          <p className="text-xs text-gray-400 text-center py-5">
            No contacts yet.{canEdit && ' Click + Add to add one.'}
          </p>
        )}

        {spocs.map((spoc) =>
          editingId === spoc.id ? (
            <div key={spoc.id} className="p-3">
              <SpocForm
                initial={spoc}
                onSave={(f) => handleUpdate(spoc.id, f)}
                onCancel={() => setEditing(null)}
                isPending={isPending}
              />
            </div>
          ) : (
            <div key={spoc.id} className="px-4 py-3 group">
              {/* Header row */}
              <div className="flex items-start gap-2.5">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {initials(spoc.name)}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{spoc.name}</p>
                  {spoc.department && (
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${deptColor(spoc.department)}`}>
                      {spoc.department}
                    </span>
                  )}
                </div>
                {/* Actions */}
                {canEdit && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => setEditing(spoc.id)} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(spoc.id)}
                      className={`p-1 rounded-md transition-colors ${confirmDel === spoc.id ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                      title={confirmDel === spoc.id ? 'Click again to confirm' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {confirmDel === spoc.id && (
                      <button onClick={() => setConfirm(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-md">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Email */}
              {spoc.email && (
                <a
                  href={`mailto:${spoc.email}`}
                  className="flex items-center gap-1.5 mt-1.5 text-xs text-blue-600 hover:text-blue-700 truncate"
                >
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  {spoc.email}
                </a>
              )}

              {/* Notes expand/collapse */}
              {spoc.notes && (
                <button
                  onClick={() => setExpanded(expandedId === spoc.id ? null : spoc.id)}
                  className="flex items-center gap-1 mt-1.5 text-xs text-gray-400 hover:text-gray-600"
                >
                  {expandedId === spoc.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Notes
                </button>
              )}
              {expandedId === spoc.id && spoc.notes && (
                <p className="mt-1 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                  {spoc.notes}
                </p>
              )}
            </div>
          )
        )}

        {adding && (
          <div className="p-3">
            <SpocForm
              onSave={handleAdd}
              onCancel={() => setAdding(false)}
              isPending={isPending}
            />
          </div>
        )}
      </div>
    </div>
  )
}
