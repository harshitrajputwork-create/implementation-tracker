'use client'

import { useState, useTransition } from 'react'
import type { UseCase, ClientUseCase } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toggleClientUseCaseAction } from '@/app/(app)/library/actions'
import { TrendingUp, ExternalLink } from 'lucide-react'

export default function GrowthTab({
  clientId,
  industry,
  useCases,
  clientUseCases,
  canEdit,
}: {
  clientId: string
  industry: string | null
  useCases: UseCase[]
  clientUseCases: ClientUseCase[]
  canEdit: boolean
}) {
  const [states, setStates] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const cuc of clientUseCases) {
      map[cuc.use_case_id] = cuc.is_using
    }
    return map
  })
  const [isPending, startTransition] = useTransition()

  function toggle(useCaseId: string) {
    if (!canEdit) return
    const next = !states[useCaseId]
    setStates((s) => ({ ...s, [useCaseId]: next }))
    startTransition(() => {
      toggleClientUseCaseAction(clientId, useCaseId, next)
    })
  }

  if (useCases.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No use cases in the library for {industry ?? 'this industry'} yet.</p>
        <p className="text-xs mt-1">Ask an admin to add entries to the Use Case Library.</p>
      </div>
    )
  }

  const using    = useCases.filter((uc) => states[uc.id])
  const notYet   = useCases.filter((uc) => !states[uc.id])

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
        <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-0.5">Growth & upsell tracker</p>
          <p className="text-blue-700">
            Toggle which use cases this client already gets value from. This drives the Growth section in the Client Update export.
            The &quot;Live examples&quot; links below are for your own reference — they never appear in the export.
          </p>
        </div>
      </div>

      {/* All use cases */}
      <div className="space-y-2">
        {useCases.map((uc) => {
          const isUsing = !!states[uc.id]
          return (
            <div
              key={uc.id}
              className={cn(
                'flex items-start gap-4 px-5 py-4 rounded-xl border transition-colors',
                isUsing ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200',
              )}
            >
              <button
                onClick={() => toggle(uc.id)}
                disabled={!canEdit || isPending}
                className={cn(
                  'mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors',
                  isUsing
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 hover:border-green-400',
                  !canEdit && 'cursor-default',
                )}
                title={canEdit ? (isUsing ? 'Mark as not using' : 'Mark as using') : undefined}
              >
                {isUsing && (
                  <svg viewBox="0 0 20 20" fill="white" className="w-full h-full p-0.5">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn('text-sm font-medium', isUsing ? 'text-green-900' : 'text-gray-900')}>
                    {uc.title}
                  </p>
                  {uc.link && (
                    <a href={uc.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                {uc.description && (
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{uc.description}</p>
                )}
                {uc.example_accounts && uc.example_accounts.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">Live examples:</span>
                    {uc.example_accounts.map((acc) => (
                      <a
                        key={acc.name}
                        href={acc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {acc.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <span className={cn(
                'text-xs font-medium flex-shrink-0 px-2 py-0.5 rounded-full',
                isUsing ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
              )}>
                {isUsing ? 'Already using' : 'Not yet'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Preview */}
      {(using.length > 0 || notYet.length > 0) && (
        <div className="bg-gray-50 rounded-xl p-5 text-sm text-gray-600">
          <p className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-3">Preview in Client Update export</p>
          {using.length > 0 && (
            <div className="mb-3">
              <p className="font-medium text-gray-700 mb-1">✓ Already getting value from</p>
              <ul className="space-y-0.5 pl-3">
                {using.map((uc) => <li key={uc.id} className="text-gray-500">· {uc.title}</li>)}
              </ul>
            </div>
          )}
          {notYet.length > 0 && (
            <div>
              <p className="font-medium text-gray-700 mb-1">→ Could also explore</p>
              <ul className="space-y-0.5 pl-3">
                {notYet.map((uc) => <li key={uc.id} className="text-gray-500">· {uc.title}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
