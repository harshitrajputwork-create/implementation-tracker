import { getSessionUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Settings } from 'lucide-react'
import SettingsView from './SettingsView'
import { PLAN_TEMPLATE } from '@/lib/plan-template'
import { IS_DEV_BYPASS, MOCK_PROFILE, MOCK_MEMBERS } from '@/lib/dev-mock'
import type { Profile, Invitation, ConfigOption, Role } from '@/lib/types'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const initialTab = tab === 'config' ? 'config' : 'team'

  let members: Profile[] = []
  let invitations: Invitation[] = []
  let configOptions: ConfigOption[] = []
  let rows: { id: string; step_order: number; step_name: string; ideated_day_range: string; description: string | null }[] | null = []

  if (IS_DEV_BYPASS) {
    members = MOCK_MEMBERS
  } else {
    const { supabase, user } = await getSessionUser()
    if (!user) redirect('/login')

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const myRole = (me?.role as Role) ?? 'visitor'
    if (myRole !== 'admin') redirect('/dashboard')

    const [{ data: m }, { data: inv }, { data: opts }, { data: stepRows }] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name', { ascending: true }),
      supabase.from('invitations').select('*').eq('accepted', false).order('created_at', { ascending: false }),
      supabase.from('config_options').select('*').order('sort_order'),
      supabase.from('step_templates').select('*').order('step_order'),
    ])
    members = (m ?? []) as Profile[]
    invitations = (inv ?? []) as Invitation[]
    configOptions = (opts ?? []) as ConfigOption[]
    rows = stepRows
  }

  const steps = rows && rows.length > 0
    ? rows
    : PLAN_TEMPLATE.map((s, i) => ({
        id: `local-${i}`,
        step_order: s.step_order,
        step_name: s.step_name,
        ideated_day_range: s.ideated_day_range,
        description: s.description,
      }))

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 w-fit"
      >
        <ChevronLeft className="w-4 h-4" />
        Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm">Team, dropdown options, and the default plan template · Admin only</p>
        </div>
      </div>

      <SettingsView
        initialTab={initialTab}
        members={members}
        invitations={invitations}
        steps={steps}
        configOptions={configOptions}
        optionsMigrationMissing={configOptions.length === 0}
        stepsMigrationMissing={!!(rows && rows.length === 0)}
      />
    </div>
  )
}
