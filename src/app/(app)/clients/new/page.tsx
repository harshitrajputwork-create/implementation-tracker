import { getSessionUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PLAN_TEMPLATE } from '@/lib/plan-template'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import SubmitButton from './SubmitButton'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { IS_DEV_BYPASS, MOCK_MEMBERS } from '@/lib/dev-mock'
import { TZ_AHEAD_OPTIONS, TZ_BEHIND_OPTIONS, TZ_SAME_AS_IST, WEEKDAYS } from '@/lib/schedule-options'
import { INDUSTRIES } from '@/lib/industries'
import type { Profile, ConfigOption } from '@/lib/types'

async function createClientAction(formData: FormData) {
  'use server'

  const name = formData.get('name') as string
  const industry = formData.get('industry') as string
  const company_size = formData.get('company_size') as string
  const owner_id = formData.get('owner_id') as string
  const kickoff_date = formData.get('kickoff_date') as string
  const notes = formData.get('notes') as string
  const ticket_size = formData.get('ticket_size') as string
  const sales_spoc = formData.get('sales_spoc') as string
  const country = formData.get('country') as string
  const modules = formData.getAll('modules') as string[]
  const account_url = formData.get('account_url') as string
  const weekly_offs_days = formData.getAll('weekly_offs') as string[]
  const weekly_offs = weekly_offs_days.length > 0 ? weekly_offs_days.join(', ') : ''
  const tz_offset = formData.get('tz_offset') as string
  const billing_type = formData.get('billing_type') as string
  const from_trial = formData.get('from_trial') as string

  if (IS_DEV_BYPASS) {
    // In dev mode, simulate redirect to a mock client
    redirect('/clients/demo-client-1')
  }

  const { supabase, user } = await getSessionUser()
  if (!user) redirect('/login')

  // Insert the client and fetch the step template concurrently — the template
  // lookup does not depend on the new client row.
  const [{ data: client, error }, { data: templateRows }] = await Promise.all([
    supabase
      .from('clients')
      .insert({
        name: name.trim(),
        industry: industry || null,
        company_size: company_size || null,
        owner_id: owner_id || user.id,
        kickoff_date: kickoff_date || null,
        notes: notes || null,
        ticket_size: ticket_size || null,
        sales_spoc: sales_spoc || null,
        country: country || null,
        modules: modules.length > 0 ? modules : null,
        account_url: account_url || null,
        weekly_offs: weekly_offs || null,
        tz_offset: tz_offset || null,
        billing_type: billing_type || null,
        created_by: user.id,
      })
      .select('id')
      .single(),
    supabase
      .from('step_templates')
      .select('step_order, step_name, ideated_day_range, description')
      .order('step_order'),
  ])

  if (error || !client) {
    throw new Error(error?.message ?? 'Could not create the client record.')
  }

  if (from_trial) {
    await supabase
      .from('trial_accounts')
      .update({ status: 'Converted', converted_client_id: client.id })
      .eq('id', from_trial)
  }

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

const TICKET_SIZES = ['Small', 'Medium', 'Large', 'XL']
const TICKET_SIZE_COLORS: Record<string, string> = {
  Small:  'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Large:  'bg-green-100 text-green-700 border-green-200',
  XL:     'bg-teal-600 text-white border-teal-600',
}

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ fromTrial?: string }>
}) {
  const { fromTrial } = await searchParams
  let userId = 'dev-user-1'
  let members = MOCK_MEMBERS
  let configOptions: ConfigOption[] = []
  let prefill: { name: string; salesSpoc: string; country: string; companySize: string; modules: string[] } | null = null

  if (!IS_DEV_BYPASS) {
    const { supabase, user } = await getSessionUser()
    if (!user) redirect('/login')
    userId = user.id

    const [{ data: profile }, { data: m }, { data: opts }, trialRes] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('profiles').select('id, full_name, email, role').in('role', ['admin', 'member']).order('full_name'),
      supabase.from('config_options').select('*').order('sort_order'),
      fromTrial
        ? supabase.from('trial_accounts').select('name, sales_spoc, country, company_size, modules').eq('id', fromTrial).single()
        : Promise.resolve({ data: null }),
    ])

    if (profile?.role === 'visitor') redirect('/dashboard')

    members = (m ?? []) as Profile[]
    configOptions = (opts ?? []) as ConfigOption[]
    if (trialRes.data) {
      prefill = {
        name: trialRes.data.name ?? '',
        salesSpoc: trialRes.data.sales_spoc ?? '',
        country: trialRes.data.country ?? '',
        companySize: trialRes.data.company_size ?? '',
        modules: trialRes.data.modules ?? [],
      }
    }
  }

  const spocOptions    = configOptions.filter((o) => o.config_key === 'sales_spoc')
  const countryOptions = configOptions.filter((o) => o.config_key === 'country')
  const moduleOptions  = configOptions.filter((o) => o.config_key === 'module')
  const today = new Date().toISOString().split('T')[0]

  const inputCls = 'w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white'
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-7">
        <Link href="/dashboard" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ChevronLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Client</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Creates a client record pre-populated with the standard 30-day implementation plan.
        </p>
      </div>

      {prefill && (
        <div className="mb-6 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl text-sm text-purple-800">
          Converting from a free trial account — some fields are pre-filled from what you already logged there.
        </div>
      )}

      <form action={createClientAction}>
        {fromTrial && <input type="hidden" name="from_trial" value={fromTrial} />}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-5">
            {/* Client name */}
            <div>
              <label className={labelCls}>Client name <span className="text-red-500">*</span></label>
              <input name="name" required defaultValue={prefill?.name} placeholder="e.g. Lenskart, Wow Momo, PVR Inox"
                className={`${inputCls} placeholder-gray-400`} />
            </div>

            {/* Account URL */}
            <div>
              <label className={labelCls}>
                <span className="flex items-center gap-1.5">
                  Account URL
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </span>
              </label>
              <input name="account_url" type="url" placeholder="https://clientname.taqtics.co/"
                className={`${inputCls} placeholder-gray-400`} />
              <p className="text-xs text-gray-400 mt-1">Clicking this URL anywhere in the tracker will open it in the browser.</p>
            </div>

            {/* Industry + Company size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Industry</label>
                <select name="industry" className={inputCls}>
                  <option value="">Select…</option>
                  {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Company size</label>
                <input name="company_size" defaultValue={prefill?.companySize ?? ''} placeholder="e.g. 12 stores"
                  className={`${inputCls} placeholder-gray-400`} />
              </div>
            </div>

            {/* Notes */}
            <div className="flex-1">
              <label className={labelCls}>Notes (optional)</label>
              <textarea name="notes" rows={5} placeholder="Scope, context, anything relevant…"
                className={`${inputCls} resize-none placeholder-gray-400`} />
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-5">
            {/* Ticket size */}
            <div>
              <label className={labelCls}>Ticket size</label>
              <div className="flex gap-2 flex-wrap">
                {TICKET_SIZES.map((s) => (
                  <label key={s} className="cursor-pointer">
                    <input type="radio" name="ticket_size" value={s} className="sr-only peer" />
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all peer-checked:ring-2 peer-checked:ring-offset-1 peer-checked:ring-blue-400 ${TICKET_SIZE_COLORS[s]} cursor-pointer`}>
                      {s}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sales SPOC + Country */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Sales SPOC</label>
                <select name="sales_spoc" defaultValue={prefill?.salesSpoc ?? ''} className={inputCls}>
                  <option value="">— none —</option>
                  {spocOptions.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Country</label>
                <select name="country" defaultValue={prefill?.country ?? ''} className={inputCls}>
                  <option value="">— none —</option>
                  {countryOptions.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Timezone + Billing type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Timezone vs IST</label>
                <select name="tz_offset" className={inputCls}>
                  <option value="">— none —</option>
                  <option value={TZ_SAME_AS_IST}>{TZ_SAME_AS_IST}</option>
                  <optgroup label="Ahead of IST">
                    {TZ_AHEAD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </optgroup>
                  <optgroup label="Behind IST">
                    {TZ_BEHIND_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className={labelCls}>Billing type</label>
                <select name="billing_type" className={inputCls}>
                  <option value="">— none —</option>
                  <option value="User-wise">User-wise</option>
                  <option value="Store-wise">Store-wise</option>
                </select>
              </div>
            </div>

            {/* Weekly offs */}
            <div>
              <label className={labelCls}>Weekly offs</label>
              <div className="flex gap-1.5 flex-wrap">
                {WEEKDAYS.map((day) => (
                  <label key={day} className="cursor-pointer">
                    <input type="checkbox" name="weekly_offs" value={day} className="sr-only peer" />
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 cursor-pointer transition-all peer-checked:bg-gray-800 peer-checked:text-white peer-checked:border-gray-800">
                      {day}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Modules */}
            {moduleOptions.length > 0 && (
              <div>
                <label className={labelCls}>Modules</label>
                <div className="flex gap-2 flex-wrap">
                  {moduleOptions.map((o) => (
                    <label key={o.id} className="cursor-pointer">
                      <input type="checkbox" name="modules" value={o.label} defaultChecked={prefill?.modules?.includes(o.label)} className="sr-only peer" />
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 cursor-pointer transition-all peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600">
                        {o.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Owner */}
            <div>
              <label className={labelCls}>Implementation owner</label>
              <select name="owner_id" defaultValue={userId} className={inputCls}>
                {members?.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name ?? m.email}{m.id === userId ? ' (you)' : ''}</option>
                ))}
              </select>
            </div>

            {/* Kickoff date */}
            <div>
              <label className={labelCls}>Kickoff date (Day 1)</label>
              <input name="kickoff_date" type="date" defaultValue={today} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-7 flex items-center gap-3 border-t border-gray-100 mt-7">
          <SubmitButton />
        </div>
      </form>
    </div>
  )
}
