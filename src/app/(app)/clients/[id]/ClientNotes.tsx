'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Lock, Users, Check } from 'lucide-react'
import { updateClientNotesAction, upsertPersonalNoteAction } from './actions'

type Mode = 'team' | 'personal'

interface Props {
  clientId: string
  teamNotes: string
  personalNote: string
  canEdit: boolean
}

export default function ClientNotes({ clientId, teamNotes: initialTeam, personalNote: initialPersonal, canEdit }: Props) {
  const [mode, setMode]       = useState<Mode>('team')
  const [team, setTeam]       = useState(initialTeam)
  const [personal, setPersonal] = useState(initialPersonal)
  const [saved, setSaved]     = useState(false)
  const [isPending, start]    = useTransition()
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const value    = mode === 'team' ? team    : personal
  const setValue = mode === 'team' ? setTeam : setPersonal

  function showSaved() {
    setSaved(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 2000)
  }

  function save() {
    start(async () => {
      if (mode === 'team') {
        await updateClientNotesAction(clientId, team)
      } else {
        await upsertPersonalNoteAction(clientId, personal)
      }
      showSaved()
    })
  }

  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current) }, [])

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Notes</h3>
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setMode('team')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'team'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-3 h-3" />
            Team
          </button>
          <button
            onClick={() => setMode('personal')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'personal'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Lock className="w-3 h-3" />
            Personal
          </button>
        </div>
      </div>

      <div className="p-3">
        {mode === 'personal' && (
          <div className="flex items-center gap-1.5 mb-2.5 px-2 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
            <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700">Only visible to you — not even admins can see this.</p>
          </div>
        )}

        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          readOnly={!canEdit && mode === 'team'}
          placeholder={
            mode === 'team'
              ? 'Shared notes visible to all team members…'
              : 'Private notes only you can read…'
          }
          rows={4}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none placeholder-gray-400 bg-white disabled:bg-gray-50"
        />

        {(canEdit || mode === 'personal') && (
          <div className="flex items-center justify-end mt-2 gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <button
              onClick={save}
              disabled={isPending}
              className="px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
