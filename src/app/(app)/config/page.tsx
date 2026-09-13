import { getSessionUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Settings } from 'lucide-react'
import ConfigEditor from './ConfigEditor'
import ConfigOptionsEditor from './ConfigOptionsEditor'
import { PLAN_TEMPLATE } from '@/lib/plan-template'
import type { ConfigOption } from '@/lib/types'

export default async function ConfigPage() {
  const { supabase, user } = await getSessionUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: rows }, { data: opts }] = await Promise.all([
    supabase.from('step_templates').select('*').order('step_order'),
    supabase.from('config_options').select('*').order('sort_order'),
  ])

  // Fall back to hardcoded template if table is empty (migration not run yet)
  const steps = rows && rows.length > 0
    ? rows
    : PLAN_TEMPLATE.map((s, i) => ({
        id: `local-${i}`,
        step_order: s.step_order,
        step_name: s.step_name,
        ideated_day_range: s.ideated_day_range,
        description: s.description,
      }))

  const configOptions = (opts ?? []) as ConfigOption[]

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Configuration</h1>
          <p className="text-sm text-gray-500">Admin only</p>
        </div>
      </div>

      {/* Dropdown options */}
      <div className="mt-8 mb-10">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-900">Dropdown Options</h2>
          <p className="text-sm text-gray-500 mt-1">
            Values available in the Sales SPOC, Country, and Modules selectors when creating or editing a client.
          </p>
        </div>

        {configOptions.length === 0 && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <strong>Migration not run yet.</strong> Run <code className="font-mono bg-amber-100 px-1 rounded">005_client_metadata.sql</code> in Supabase SQL Editor to enable editing.
          </div>
        )}

        <ConfigOptionsEditor initialOptions={configOptions} />
      </div>

      <hr className="border-gray-200 mb-10" />

      {/* Step template */}
      <div>
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-900">Default 30-Day Plan Template</h2>
          <p className="text-sm text-gray-500 mt-1">
            These steps are copied to every new client when they are created. Editing here does not
            affect existing clients — only new ones created after you save.
          </p>
        </div>

        {rows && rows.length === 0 && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <strong>Migration not run yet.</strong> Run <code className="font-mono bg-amber-100 px-1 rounded">004_step_templates.sql</code> in Supabase SQL Editor to enable editing. Showing read-only defaults for now.
          </div>
        )}

        <ConfigEditor initialSteps={steps} />
      </div>
    </div>
  )
}
