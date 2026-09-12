'use client'

import { useState, useTransition } from 'react'
import { updateStepAction } from '@/app/(app)/clients/[id]/actions'
import { CheckCircle2, X } from 'lucide-react'

export default function QuickMarkDone({
  clientId,
  stepId,
  stepName,
}: {
  clientId: string
  stepId: string
  stepName: string
}) {
  const [open, setOpen]           = useState(false)
  const [date, setDate]           = useState(new Date().toISOString().split('T')[0])
  const [isPending, startTransition] = useTransition()
  const [done, setDone]           = useState(false)

  function confirm() {
    startTransition(async () => {
      await updateStepAction(stepId, clientId, 'done', date)
      setDone(true)
      setOpen(false)
    })
  }

  if (done) {
    return <span className="text-xs text-green-600 font-medium">✓ Done</span>
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="text-xs text-gray-400 hover:text-gray-700 transition-colors whitespace-nowrap"
        title={`Mark "${stepName}" done`}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* popover */}
          <div
            className="absolute z-20 left-0 top-6 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-64"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700 truncate pr-2">{stepName}</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <label className="text-xs text-gray-500 block mb-1">Completion date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-900 mb-3"
            />
            <button
              onClick={confirm}
              disabled={isPending}
              className="w-full px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Confirm done'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
