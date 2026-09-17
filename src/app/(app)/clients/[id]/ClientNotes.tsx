'use client'

import { useState, useTransition } from 'react'
import { Lock, Users, CalendarClock, Trash2, Send, X } from 'lucide-react'
import MentionTextarea from '@/components/MentionTextarea'
import { addClientNoteAction, deleteClientNoteAction, toggleNoteDeadlineDoneAction } from './actions'
import { formatDate } from '@/lib/utils'
import type { ClientNoteEntry, Profile } from '@/lib/types'

type Mode = 'team' | 'personal'

function highlightMentions(text: string) {
  const parts = text.split(/(@[A-Za-z][\w' -]*)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-blue-600 font-medium">{part}</span>
      : <span key={i}>{part}</span>,
  )
}

function NoteRow({ note, clientId, currentUserId }: { note: ClientNoteEntry; clientId: string; currentUserId: string | null }) {
  const [isPending, start] = useTransition()
  const [confirmDel, setConfirmDel] = useState(false)
  const isOwn = note.author_id === currentUserId
  const overdue = note.deadline && !note.deadline_done && new Date(note.deadline + 'T00:00:00') < new Date(new Date().toDateString())

  function remove() {
    if (!confirmDel) { setConfirmDel(true); return }
    start(async () => { await deleteClientNoteAction(note.id, clientId) })
  }

  function toggleDone() {
    start(async () => { await toggleNoteDeadlineDoneAction(note.id, clientId, !note.deadline_done) })
  }

  return (
    <div id={`note-${note.id}`} className="px-4 py-3 group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-700">{note.author_name ?? 'Someone'}</span>
          <span className="text-[10px] text-gray-400">{formatDate(note.created_at)}</span>
        </div>
        {isOwn && (
          <button
            onClick={remove}
            disabled={isPending}
            title={confirmDel ? 'Click again to confirm' : 'Delete'}
            className={`opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all ${confirmDel ? 'opacity-100 text-red-600 bg-red-50' : 'text-gray-300 hover:text-red-600 hover:bg-red-50'}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">{highlightMentions(note.content)}</p>
      {note.deadline && (
        <button
          onClick={isOwn ? toggleDone : undefined}
          disabled={!isOwn || isPending}
          className={`flex items-center gap-1 mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
            note.deadline_done
              ? 'bg-green-50 text-green-700 border-green-200'
              : overdue
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          } ${isOwn ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
        >
          <CalendarClock className="w-3 h-3" />
          {note.deadline_done ? 'Done' : overdue ? 'Overdue' : 'Due'} {formatDate(note.deadline)}
        </button>
      )}
    </div>
  )
}

interface Props {
  clientId: string
  currentUserId: string | null
  teamEntries: ClientNoteEntry[]
  personalEntries: ClientNoteEntry[]
  legacyTeamNote: string
  legacyPersonalNote: string
  members: Profile[]
  canEdit: boolean
}

export default function ClientNotes({
  clientId, currentUserId, teamEntries, personalEntries, legacyTeamNote, legacyPersonalNote, members, canEdit,
}: Props) {
  const [mode, setMode] = useState<Mode>('team')
  const [content, setContent] = useState('')
  const [mentionedIds, setMentionedIds] = useState<string[]>([])
  const [showDeadline, setShowDeadline] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [isPending, start] = useTransition()

  const entries = mode === 'team' ? teamEntries : personalEntries
  const legacy = mode === 'team' ? legacyTeamNote : legacyPersonalNote
  const canPost = mode === 'team' ? canEdit : true

  function post() {
    if (!content.trim()) return
    start(async () => {
      await addClientNoteAction(clientId, content, mode === 'personal', showDeadline ? deadline || null : null, mentionedIds)
      setContent('')
      setMentionedIds([])
      setShowDeadline(false)
      setDeadline('')
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Notes</h3>
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setMode('team')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${mode === 'team' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Users className="w-3 h-3" /> Team
          </button>
          <button
            onClick={() => setMode('personal')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${mode === 'personal' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Lock className="w-3 h-3" /> Personal
          </button>
        </div>
      </div>

      {mode === 'personal' && (
        <div className="flex items-center gap-1.5 mx-3 mt-3 px-2 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
          <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">Only visible to you — not even admins can see this.</p>
        </div>
      )}

      {/* Legacy single-note continuity */}
      {legacy && (
        <div className="mx-3 mt-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Earlier note</p>
          <p className="text-xs text-gray-500 whitespace-pre-wrap">{legacy}</p>
        </div>
      )}

      {/* Entries list */}
      <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
        {entries.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-5">No notes logged yet.</p>
        )}
        {entries.map((n) => (
          <NoteRow key={n.id} note={n} clientId={clientId} currentUserId={currentUserId} />
        ))}
      </div>

      {/* Composer */}
      {canPost && (
        <div className="p-3 border-t border-gray-100 space-y-2">
          <MentionTextarea
            value={content}
            onChange={setContent}
            members={members}
            mentionedIds={mentionedIds}
            onMentionedIdsChange={setMentionedIds}
            placeholder={mode === 'team' ? 'Log a note… type @ to tag someone' : 'Log a private note…'}
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none placeholder-gray-400 bg-white"
          />

          {showDeadline ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button onClick={() => { setShowDeadline(false); setDeadline('') }} className="text-gray-300 hover:text-gray-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeadline(true)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <CalendarClock className="w-3.5 h-3.5" /> Add deadline / reminder
            </button>
          )}

          <div className="flex justify-end">
            <button
              onClick={post}
              disabled={isPending || !content.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {isPending ? 'Posting…' : 'Post note'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
