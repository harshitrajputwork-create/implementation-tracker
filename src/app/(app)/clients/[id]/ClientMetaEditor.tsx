'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X, ExternalLink, Trash2 } from 'lucide-react'
import { updateClientMetaAction, deleteClientAction } from './actions'
import type { Client, Profile, ConfigOption } from '@/lib/types'

const TICKET_SIZE_CFG: Record<string, { label: string; color: string }> = {
  Small:  { label: 'Small',  color: 'bg-red-100 text-red-700 border-red-200' },
  Medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  Large:  { label: 'Large',  color: 'bg-green-100 text-green-700 border-green-200' },
  XL:     { label: 'XL',     color: 'bg-teal-600 text-white border-teal-600' },
}

export function TicketSizeBadge({ size }: { size: string | null }) {
  if (!size) return null
  const cfg = TICKET_SIZE_CFG[size]
  if (!cfg) return <span className="text-sm text-gray-600">{size}</span>
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

interface Props {
  client: Client
  members: Profile[]
  configOptions: ConfigOption[]
  canEdit: boolean
  compact?: boolean
  isAdmin?: boolean
}

export default function ClientMetaEditor({ client, members, configOptions, canEdit, compact, isAdmin }: Props) {
  const [open, setOpen]       = useState(false)
  const [isPending, start]    = useTransition()
  const [showDelete, setShowDelete]     = useState(false)
  const [confirmText, setConfirmText]   = useState('')
  const [deleteError, setDeleteError]   = useState<string | null>(null)
  const [deletePending, startDelete]    = useTransition()

  const [name,       setName]       = useState(client.name)
  const [industry,   setIndustry]   = useState(client.industry ?? '')
  const [size,       setSize]       = useState(client.company_size ?? '')
  const [ownerId,    setOwnerId]    = useState(client.owner_id ?? '')
  const [kickoff,    setKickoff]    = useState(client.kickoff_date ?? '')
  const [notes,      setNotes]      = useState(client.notes ?? '')
  const [ticketSize, setTicketSize] = useState(client.ticket_size ?? '')
  const [spoc,       setSpoc]       = useState(client.sales_spoc ?? '')
  const [country,    setCountry]    = useState(client.country ?? '')
  const [modules,    setModules]    = useState<string[]>(client.modules ?? [])
  const [accountUrl, setAccountUrl] = useState(client.account_url ?? '')
  const [weeklyOffs, setWeeklyOffs] = useState(client.weekly_offs ?? '')
  const [tzOffset,   setTzOffset]   = useState(client.tz_offset ?? '')

  const spocOptions    = configOptions.filter((o) => o.config_key === 'sales_spoc')
  const countryOptions = configOptions.filter((o) => o.config_key === 'country')
  const moduleOptions  = configOptions.filter((o) => o.config_key === 'module')

  function toggleModule(mod: string) {
    setModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod],
    )
  }

  function save() {
    start(async () => {
      await updateClientMetaAction(client.id, {
        name: name.trim() || client.name,
        industry: industry || null,
        company_size: size || null,
        owner_id: ownerId || null,
        kickoff_date: kickoff || null,
        notes: notes || null,
        ticket_size: ticketSize || null,
        sales_spoc: spoc || null,
        country: country || null,
        modules,
        account_url: accountUrl.trim() || null,
        weekly_offs: weeklyOffs.trim() || null,
        tz_offset: tzOffset.trim() || null,
      })
      setOpen(false)
    })
  }

  function handleDelete() {
    if (confirmText !== client.name) return
    setDeleteError(null)
    startDelete(async () => {
      const result = await deleteClientAction(client.id)
      if (result?.error) setDeleteError(result.error)
    })
  }

  if (!canEdit) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={compact
          ? 'p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors'
          : 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors'
        }
        title="Edit details"
      >
        <Pencil className="w-3.5 h-3.5" />
        {!compact && 'Edit details'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Edit client details</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <Field label="Client name">
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </Field>

              {/* Account URL */}
              <Field label={<span className="flex items-center gap-1.5">Account URL <ExternalLink className="w-3 h-3 text-gray-400" /></span>}>
                <input
                  value={accountUrl}
                  onChange={(e) => setAccountUrl(e.target.value)}
                  type="url"
                  placeholder="https://clientname.taqtics.co/"
                  className={`${inputCls} placeholder-gray-400`}
                />
              </Field>

              {/* Ticket Size */}
              <Field label="Ticket size">
                <div className="flex gap-2 flex-wrap">
                  {['Small', 'Medium', 'Large', 'XL'].map((s) => {
                    const cfg = TICKET_SIZE_CFG[s]
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTicketSize(ticketSize === s ? '' : s)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                          ticketSize === s ? cfg.color : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </Field>

              {/* Sales SPOC + Country row */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Sales SPOC">
                  <select value={spoc} onChange={(e) => setSpoc(e.target.value)} className={inputCls}>
                    <option value="">— none —</option>
                    {spocOptions.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Country">
                  <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
                    <option value="">— none —</option>
                    {countryOptions.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
                  </select>
                </Field>
              </div>

              {/* Timezone + Weekly offs row */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Timezone vs IST">
                  <input
                    value={tzOffset}
                    onChange={(e) => setTzOffset(e.target.value)}
                    placeholder="e.g. 2h 30m ahead of IST"
                    className={`${inputCls} placeholder-gray-400`}
                  />
                </Field>
                <Field label="Weekly offs">
                  <input
                    value={weeklyOffs}
                    onChange={(e) => setWeeklyOffs(e.target.value)}
                    placeholder="e.g. Closed Sat & Sun"
                    className={`${inputCls} placeholder-gray-400`}
                  />
                </Field>
              </div>

              {/* Modules */}
              <Field label="Modules">
                <div className="flex gap-1.5 flex-wrap">
                  {moduleOptions.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleModule(o.label)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                        modules.includes(o.label)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </Field>

              <hr className="border-gray-100" />

              {/* Industry + Size */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Industry">
                  <input value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputCls} placeholder="e.g. Food & Beverage" />
                </Field>
                <Field label="Company size">
                  <input value={size} onChange={(e) => setSize(e.target.value)} className={inputCls} placeholder="e.g. 12 stores" />
                </Field>
              </div>

              {/* Owner + Kickoff */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Implementation owner">
                  <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputCls}>
                    <option value="">— unassigned —</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name ?? m.email}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Kickoff date">
                  <input type="date" value={kickoff} onChange={(e) => setKickoff(e.target.value)} className={inputCls} />
                </Field>
              </div>

              {/* Notes */}
              <Field label="Notes">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
              </Field>

              {/* Danger zone — admin only */}
              {isAdmin && (
                <div className="border border-red-200 rounded-xl p-4 bg-red-50/50">
                  <p className="text-xs font-semibold text-red-700 mb-2">Danger zone</p>
                  {!showDelete ? (
                    <button
                      type="button"
                      onClick={() => setShowDelete(true)}
                      className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete this client
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-red-700">
                        This permanently deletes <strong>{client.name}</strong> and everything attached to it — plan steps, deviation log, SPOCs, notes, activity history. This cannot be undone.
                      </p>
                      <p className="text-xs text-gray-500">
                        Type <strong>{client.name}</strong> to confirm.
                      </p>
                      <input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={client.name}
                        className={`${inputCls} border-red-200 focus:ring-red-400`}
                      />
                      {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={confirmText !== client.name || deletePending}
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

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={isPending}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" />
                {isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white'

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}
