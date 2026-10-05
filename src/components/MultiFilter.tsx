'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Filter, X } from 'lucide-react'

export function unique(arr: (string | null | undefined)[]): string[] {
  return [...new Set(arr.filter(Boolean))] as string[]
}

export default function MultiFilter({
  label,
  options,
  selected,
  onChange,
  accentColor = 'blue',
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  accentColor?: 'blue' | 'purple'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v])
  }

  const active = selected.length > 0
  const activeCls = accentColor === 'purple'
    ? 'bg-purple-50 border-purple-300 text-purple-700 font-medium'
    : 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
  const badgeCls = accentColor === 'purple' ? 'bg-purple-500' : 'bg-blue-600'
  const checkboxCls = accentColor === 'purple'
    ? 'rounded border-gray-300 text-purple-600 focus:ring-purple-500'
    : 'rounded border-gray-300 text-blue-600 focus:ring-blue-500'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
          active ? activeCls : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        {label}
        {active && (
          <span className={`text-white text-xs rounded-full px-1.5 py-0.5 leading-none font-semibold ${badgeCls}`}>
            {selected.length}
          </span>
        )}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[180px] py-1">
          {options.length === 0 && (
            <p className="text-xs text-gray-400 px-3 py-2">No values</p>
          )}
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className={checkboxCls}
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
          {active && (
            <button
              onClick={() => onChange([])}
              className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-t border-gray-100 mt-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
