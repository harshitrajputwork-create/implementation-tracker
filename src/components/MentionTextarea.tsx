'use client'

import { useRef, useState } from 'react'
import type { Profile } from '@/lib/types'
import { getInitials } from '@/lib/utils'

interface Props {
  value: string
  onChange: (value: string) => void
  members: Profile[]
  mentionedIds: string[]
  onMentionedIdsChange: (ids: string[]) => void
  placeholder?: string
  rows?: number
  className?: string
  autoFocus?: boolean
}

export default function MentionTextarea({
  value, onChange, members, mentionedIds, onMentionedIdsChange,
  placeholder, rows = 3, className, autoFocus,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [query, setQuery]         = useState<string | null>(null)
  const [triggerAt, setTriggerAt] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)

  const matches = query === null
    ? []
    : members
        .filter((m) => {
          const name = (m.full_name ?? m.email).toLowerCase()
          return name.includes(query.toLowerCase())
        })
        .slice(0, 6)

  function detectTrigger(text: string, cursor: number) {
    const upToCursor = text.slice(0, cursor)
    const at = upToCursor.lastIndexOf('@')
    if (at === -1) { setQuery(null); return }
    const between = upToCursor.slice(at + 1)
    if (/\s/.test(between)) { setQuery(null); return }
    const charBefore = at > 0 ? text[at - 1] : ' '
    if (!/\s|^$/.test(charBefore)) { setQuery(null); return }
    setQuery(between)
    setTriggerAt(at)
    setActiveIdx(0)
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value
    onChange(text)
    detectTrigger(text, e.target.selectionStart ?? text.length)
  }

  function pick(member: Profile) {
    const name = member.full_name ?? member.email
    const cursor = ref.current?.selectionStart ?? value.length
    const before = value.slice(0, triggerAt)
    const after  = value.slice(cursor)
    const next = `${before}@${name} ${after}`
    onChange(next)
    if (!mentionedIds.includes(member.id)) {
      onMentionedIdsChange([...mentionedIds, member.id])
    }
    setQuery(null)
    requestAnimationFrame(() => {
      const pos = before.length + name.length + 2
      ref.current?.focus()
      ref.current?.setSelectionRange(pos, pos)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (query === null || matches.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => (i + 1) % matches.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => (i - 1 + matches.length) % matches.length) }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(matches[activeIdx]) }
    else if (e.key === 'Escape') { setQuery(null) }
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        className={className}
      />
      {query !== null && matches.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto">
          {matches.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(m) }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-left transition-colors ${
                i === activeIdx ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {getInitials(m.full_name ?? m.email)}
              </span>
              <span className="text-sm text-gray-700 truncate">{m.full_name ?? m.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
