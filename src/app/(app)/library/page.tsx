import { getSessionUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, BookOpen, Plus, Trash2, ExternalLink, X } from 'lucide-react'
import type { UseCase } from '@/lib/types'
import { IS_DEV_BYPASS } from '@/lib/dev-mock'
import { createUseCaseAction, deleteUseCaseAction, addExampleAccountAction, removeExampleAccountAction } from './actions'
import { revalidatePath } from 'next/cache'

const INDUSTRIES = [
  'Retail', 'Food & Beverage (QSR)', 'Hospitality', 'Healthcare',
  'Education', 'Financial Services', 'Manufacturing', 'E-commerce',
  'Technology', 'Real Estate', 'Logistics', 'Other',
]

async function deleteAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  await deleteUseCaseAction(id)
  revalidatePath('/library')
}

async function addExampleAction(formData: FormData) {
  'use server'
  const useCaseId = formData.get('use_case_id') as string
  const name = formData.get('name') as string
  const url = formData.get('url') as string
  const checklistTitle = formData.get('checklist_title') as string
  const formId = formData.get('form_id') as string
  await addExampleAccountAction(useCaseId, name, url, checklistTitle, formId)
}

async function removeExampleAction(formData: FormData) {
  'use server'
  const useCaseId = formData.get('use_case_id') as string
  const name = formData.get('name') as string
  await removeExampleAccountAction(useCaseId, name)
}

export default async function LibraryPage() {
  let useCases: UseCase[] = []
  let isAdmin = false

  if (IS_DEV_BYPASS) {
    isAdmin = true
    useCases = [
      {
        id: 'demo-uc-1',
        title: 'Daily Checklist Audits',
        description: 'Use Taqtics checklists for daily store opening/closing audits. Drives consistency across branches.',
        industry_tag: 'Retail',
        link: null,
        example_accounts: [],
        created_by: null,
        created_at: '2026-09-01T09:00:00Z',
      },
      {
        id: 'demo-uc-2',
        title: 'Kitchen Hygiene SOP Compliance',
        description: 'Run weekly kitchen hygiene SOPs via the platform. Send non-compliance alerts to area managers.',
        industry_tag: 'Food & Beverage (QSR)',
        link: null,
        example_accounts: [],
        created_by: null,
        created_at: '2026-09-01T09:00:00Z',
      },
    ]
  } else {
    const { supabase, user } = await getSessionUser()
    if (!user) redirect('/login')

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    isAdmin = me?.role === 'admin'
    if (!isAdmin) redirect('/dashboard')

    const { data: uc } = await supabase
      .from('use_cases')
      .select('*')
      .order('industry_tag', { ascending: true })
      .order('title', { ascending: true })
    useCases = (uc ?? []) as UseCase[]
  }

  const grouped = useCases.reduce<Record<string, UseCase[]>>((acc, uc) => {
    const key = uc.industry_tag ?? 'Other'
    ;(acc[key] ??= []).push(uc)
    return acc
  }, {})

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 w-fit"
      >
        <ChevronLeft className="w-4 h-4" />
        Dashboard
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Use Case Library</h1>
            <p className="text-gray-500 text-sm">{useCases.length} entries · shown per-client by industry tag</p>
          </div>
        </div>
      </div>

      {/* Add form */}
      {isAdmin && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-blue-500" />
            Add use case
          </h2>
          <form action={createUseCaseAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Daily Checklist Audits"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Industry tag</label>
                <select
                  name="industry_tag"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All industries</option>
                  {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Link (optional)</label>
                <input
                  name="link"
                  type="url"
                  placeholder="https://…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="What does this use case help achieve?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Add to library
            </button>
          </form>
        </div>
      )}

      {/* Library grouped by industry */}
      {useCases.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No use cases yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([industry, items]) => (
            <div key={industry}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{industry}</h3>
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                {items.map((uc) => (
                  <div key={uc.id} className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-gray-900">{uc.title}</p>
                          {uc.link && (
                            <a
                              href={uc.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        {uc.description && (
                          <p className="text-sm text-gray-500 mt-0.5 leading-snug">{uc.description}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <form action={deleteAction}>
                          <input type="hidden" name="id" value={uc.id} />
                          <button
                            type="submit"
                            className="text-gray-300 hover:text-red-500 transition-colors"
                            title="Delete use case"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Example accounts — real accounts to open when demoing this use case */}
                    {(uc.example_accounts && uc.example_accounts.length > 0) && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {uc.example_accounts.map((acc) => (
                          <span
                            key={acc.name}
                            title={acc.checklistTitle ? `Search for: ${acc.checklistTitle}${acc.formId ? ` (${acc.formId})` : ''}` : undefined}
                            className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-blue-50 border border-blue-200"
                          >
                            <a href={acc.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline">
                              {acc.name}
                            </a>
                            {acc.checklistTitle && (
                              <span className="text-[10px] text-blue-400 truncate max-w-[180px]">
                                · {acc.checklistTitle}{acc.formId ? ` (${acc.formId})` : ''}
                              </span>
                            )}
                            {isAdmin && (
                              <form action={removeExampleAction}>
                                <input type="hidden" name="use_case_id" value={uc.id} />
                                <input type="hidden" name="name" value={acc.name} />
                                <button type="submit" title="Remove example account" className="text-blue-300 hover:text-red-500 flex-shrink-0">
                                  <X className="w-3 h-3" />
                                </button>
                              </form>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {isAdmin && (
                      <details className="mt-2 group">
                        <summary className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer list-none inline-flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Add example account
                        </summary>
                        <form action={addExampleAction} className="flex items-center gap-2 mt-2 flex-wrap">
                          <input type="hidden" name="use_case_id" value={uc.id} />
                          <input
                            name="name"
                            required
                            placeholder="Account name"
                            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                          />
                          <input
                            name="url"
                            type="url"
                            required
                            placeholder="https://account.taqtics.co/"
                            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 min-w-[160px]"
                          />
                          <input
                            name="checklist_title"
                            placeholder="Checklist title (optional)"
                            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-40"
                          />
                          <input
                            name="form_id"
                            placeholder="Form ID (optional)"
                            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
                          />
                          <button
                            type="submit"
                            className="px-2.5 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-800 transition-colors"
                          >
                            Add
                          </button>
                        </form>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
