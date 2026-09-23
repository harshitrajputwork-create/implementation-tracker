import { getSessionUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrialDashboardClient from './TrialDashboardClient'
import { IS_DEV_BYPASS } from '@/lib/dev-mock'
import type { TrialAccount, ConfigOption, Profile } from '@/lib/types'

export default async function TrialDashboardPage() {
  let trials: TrialAccount[] = []
  let configOptions: ConfigOption[] = []
  let members: Profile[] = []

  if (!IS_DEV_BYPASS) {
    const { supabase, user } = await getSessionUser()
    if (!user) redirect('/login')

    const [{ data: t }, { data: opts }, { data: m }] = await Promise.all([
      supabase
        .from('trial_accounts')
        .select('*, owner:profiles!owner_id(id, full_name, email, role)')
        .order('created_at', { ascending: false }),
      supabase.from('config_options').select('*').order('sort_order'),
      supabase.from('profiles').select('id, full_name, email, role').in('role', ['admin', 'member']).order('full_name'),
    ])

    trials = (t ?? []) as TrialAccount[]
    configOptions = (opts ?? []) as ConfigOption[]
    members = (m ?? []) as Profile[]
  }

  return (
    <div className="p-8 w-full">
      <TrialDashboardClient initialTrials={trials} configOptions={configOptions} members={members} />
    </div>
  )
}
