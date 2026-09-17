import { getSessionUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import QuickCapture from './QuickCapture'
import { IS_DEV_BYPASS, MOCK_CLIENTS } from '@/lib/dev-mock'

export const metadata = { title: 'Quick Note — Implementation Tracker' }

export default async function QuickPage() {
  let clients: { id: string; name: string }[] = []
  let teamSuggestions: string[] = []
  let personSuggestions: string[] = []
  let accountSuggestions: string[] = []

  if (IS_DEV_BYPASS) {
    clients = MOCK_CLIENTS.map((c) => ({ id: c.id, name: c.name }))
  } else {
    const { supabase, user } = await getSessionUser()
    if (!user) redirect('/login')

    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('planner_tasks').select('team, person, account_name').eq('user_id', user.id),
    ])

    clients = (c ?? []) as { id: string; name: string }[]
    teamSuggestions = [...new Set((t ?? []).map((r) => r.team).filter((v): v is string => !!v))]
    personSuggestions = [...new Set((t ?? []).map((r) => r.person).filter((v): v is string => !!v))]
    accountSuggestions = [...new Set([
      ...clients.map((c) => c.name),
      ...(t ?? []).map((r) => r.account_name).filter((v): v is string => !!v),
    ])]
  }

  return (
    <Suspense fallback={null}>
      <QuickCapture
        clients={clients}
        teamSuggestions={teamSuggestions}
        personSuggestions={personSuggestions}
        accountSuggestions={accountSuggestions}
      />
    </Suspense>
  )
}
