import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PLAN_TEMPLATE } from '@/lib/plan-template'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { IS_DEV_BYPASS, MOCK_MEMBERS } from '@/lib/dev-mock'
import type { Profile } from '@/lib/types'

const INDUSTRIES = [
  'Retail',
  'Food & Beverage (QSR)',
  'Hospitality',
  'Healthcare',
  'Education',
  'Financial Services',
  'Manufacturing',
  'E-commerce',
  'Technology',
  'Real Estate',
  'Logistics',
  'Other',
]

async function createClientAction(formData: FormData) {
  'use server'

  const name = formData.get('name') as string
  const industry = formData.get('industry') as string
  const company_size = formData.get('company_size') as string
  const owner_id = formData.get('owner_id') as string
  const kickoff_date = formData.get('kickoff_date') as string
  const notes = formData.get('notes') as string

  if (IS_DEV_BYPASS) {
    // In dev mode, simulate redirect to a mock client
    redirect('/clients/demo-client-1')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      name: name.trim(),
      industry: industry || null,
      company_size: company_size || null,
      owner_id: owner_id || user.id,
      kickoff_date: kickoff_date || null,
      notes: notes || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !client) return

  // Use DB template if available, fall back to hardcoded constant
  const { data: templateRows } = await supabase
    .from('step_templates')
    .select('step_order, step_name, ideated_day_range, description')
    .order('step_order')

  const template = templateRows && templateRows.length > 0 ? templateRows : PLAN_TEMPLATE

  const steps = template.map((s) => ({
    client_id: client.id,
    step_name: s.step_name,
    ideated_day_range: s.ideated_day_range,
    step_order: s.step_order,
    description: s.description ?? null,
    status: 'not_started' as const,
  }))

  await supabase.from('plan_steps').insert(steps)

  revalidatePath('/dashboard')
  redirect(`/clients/${client.id}`)
}

export default async function NewClientPage() {
  let userId = 'dev-user-1'
  let members = MOCK_MEMBERS

  if (!IS_DEV_BYPASS) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    userId = user.id

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'visitor') redirect('/dashboard')

    const { data: m } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['admin', 'member'])
      .order('full_name')
    members = (m ?? []) as Profile[]
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Client</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Creates a client record pre-populated with the standard 30-day implementation plan.
        </p>
      </div>

      <form action={createClientAction} className="space-y-5">
        {/* Client name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Client name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            required
            placeholder="e.g. Lenskart, Wow Momo, PVR Inox"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Industry */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Industry
          </label>
          <select
            name="industry"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
          >
            <option value="">Select industry…</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        {/* Company size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Company size (stores / outlets)
          </label>
          <input
            name="company_size"
            placeholder="e.g. 12 stores"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Owner */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Implementation owner
          </label>
          <select
            name="owner_id"
            defaultValue={userId}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
          >
            {members?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name ?? m.email}{m.id === userId ? ' (you)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Kickoff date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Kickoff date (Day 1)
          </label>
          <input
            name="kickoff_date"
            type="date"
            defaultValue={today}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Notes (optional)
          </label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Scope, modules in play, anything relevant…"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
          />
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold"
          >
            Create client & open plan
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
