import { getSessionUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotebookPen } from 'lucide-react'
import PlannerClient from './PlannerClient'
import BookmarkletLink from './BookmarkletLink'
import { IS_DEV_BYPASS, MOCK_PROFILE, MOCK_CLIENTS } from '@/lib/dev-mock'
import type { PlannerTask } from '@/lib/types'

interface NoteDeadline {
  id: string
  clientId: string | null
  trialAccountId: string | null
  clientName: string
  content: string
  deadline: string
  deadline_done: boolean
}

interface LatestUpdate {
  id: string
  clientId: string | null
  trialAccountId: string | null
  clientName: string
  content: string
  authorName: string
  createdAt: string
  isPersonal: boolean
}

export default async function PlannerPage() {
  let tasks: PlannerTask[] = []
  let clients: { id: string; name: string }[] = []
  let trials: { id: string; name: string }[] = []
  let noteDeadlines: NoteDeadline[] = []
  let latestUpdates: LatestUpdate[] = []
  let teamSuggestions: string[] = []
  let personSuggestions: string[] = []

  if (IS_DEV_BYPASS) {
    clients = MOCK_CLIENTS.map((c) => ({ id: c.id, name: c.name }))
  } else {
    const { supabase, user } = await getSessionUser()
    if (!user) redirect('/login')

    const [{ data: t }, { data: c }, { data: trialRows }, { data: notes }, { data: recent }] = await Promise.all([
      supabase.from('planner_tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('trial_accounts').select('id, name').order('name'),
      // My own deadline-bearing notes, on either a client or a trial account.
      supabase
        .from('client_notes')
        .select('id, client_id, trial_account_id, content, deadline, deadline_done, clients(name), trial_accounts(name)')
        .eq('author_id', user.id)
        .not('deadline', 'is', null)
        .order('deadline'),
      // Latest note per account (any author I can see — RLS already hides
      // other people's personal notes). Deduped client-side below.
      supabase
        .from('client_notes')
        .select('id, client_id, trial_account_id, content, author_name, created_at, is_personal, clients(name), trial_accounts(name)')
        .order('created_at', { ascending: false })
        .limit(200),
    ])

    tasks = (t ?? []) as PlannerTask[]
    clients = (c ?? []) as { id: string; name: string }[]
    trials = (trialRows ?? []) as { id: string; name: string }[]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    noteDeadlines = (notes ?? []).map((n: any) => ({
      id: n.id,
      clientId: n.client_id,
      trialAccountId: n.trial_account_id,
      clientName: n.clients?.name ?? n.trial_accounts?.name ?? 'Account',
      content: n.content,
      deadline: n.deadline,
      deadline_done: n.deadline_done,
    }))

    const seen = new Set<string>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const n of (recent ?? []) as any[]) {
      const key = n.client_id ?? n.trial_account_id
      if (!key || seen.has(key)) continue
      seen.add(key)
      latestUpdates.push({
        id: n.id,
        clientId: n.client_id,
        trialAccountId: n.trial_account_id,
        clientName: n.clients?.name ?? n.trial_accounts?.name ?? 'Account',
        content: n.content,
        authorName: n.author_name ?? 'Someone',
        createdAt: n.created_at,
        isPersonal: n.is_personal,
      })
    }

    teamSuggestions = [...new Set(tasks.map((t) => t.team).filter((v): v is string => !!v))]
    personSuggestions = [...new Set(tasks.map((t) => t.person).filter((v): v is string => !!v))]
  }

  const accountSuggestions = [...new Set([
    ...clients.map((c) => c.name),
    ...trials.map((t) => t.name),
    ...tasks.map((t) => t.account_name).filter((v): v is string => !!v),
  ])]

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <NotebookPen className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planner</h1>
          <p className="text-gray-500 text-sm">Your personal task list — private to you, across every team and account.</p>
        </div>
      </div>

      <div className="mb-6">
        <BookmarkletLink />
      </div>

      <PlannerClient
        initialTasks={tasks}
        clients={clients}
        trials={trials}
        noteDeadlines={noteDeadlines}
        latestUpdates={latestUpdates}
        teamSuggestions={teamSuggestions}
        personSuggestions={personSuggestions}
        accountSuggestions={accountSuggestions}
      />
    </div>
  )
}
