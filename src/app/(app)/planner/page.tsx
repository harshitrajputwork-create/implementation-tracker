import { getSessionUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotebookPen } from 'lucide-react'
import PlannerClient from './PlannerClient'
import { IS_DEV_BYPASS, MOCK_PROFILE, MOCK_CLIENTS } from '@/lib/dev-mock'
import type { PlannerTask } from '@/lib/types'

export default async function PlannerPage() {
  let tasks: PlannerTask[] = []
  let clients: { id: string; name: string }[] = []
  let noteDeadlines: { id: string; clientId: string; clientName: string; content: string; deadline: string; deadline_done: boolean }[] = []

  if (IS_DEV_BYPASS) {
    clients = MOCK_CLIENTS.map((c) => ({ id: c.id, name: c.name }))
  } else {
    const { supabase, user } = await getSessionUser()
    if (!user) redirect('/login')

    const [{ data: t }, { data: c }, { data: notes }] = await Promise.all([
      supabase.from('planner_tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').order('name'),
      supabase
        .from('client_notes')
        .select('id, client_id, content, deadline, deadline_done, clients(name)')
        .eq('author_id', user.id)
        .not('deadline', 'is', null)
        .order('deadline'),
    ])

    tasks = (t ?? []) as PlannerTask[]
    clients = (c ?? []) as { id: string; name: string }[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    noteDeadlines = (notes ?? []).map((n: any) => ({
      id: n.id,
      clientId: n.client_id,
      clientName: n.clients?.name ?? 'Client',
      content: n.content,
      deadline: n.deadline,
      deadline_done: n.deadline_done,
    }))
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <NotebookPen className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planner</h1>
          <p className="text-gray-500 text-sm">Your personal task list — private to you, across every team and account.</p>
        </div>
      </div>

      <PlannerClient initialTasks={tasks} clients={clients} noteDeadlines={noteDeadlines} />
    </div>
  )
}
