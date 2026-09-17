import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { IS_DEV_BYPASS, MOCK_PROFILE, MOCK_CLIENTS } from '@/lib/dev-mock'
import type { AppNotification } from '@/lib/types'
import type { UpcomingReminder } from '@/components/NotificationBell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let profile = IS_DEV_BYPASS ? MOCK_PROFILE : null
  let clients: { id: string; name: string; status: string }[] = []
  let notifications: AppNotification[] = []
  let unreadCount = 0
  let upcoming: UpcomingReminder[] = []

  if (!IS_DEV_BYPASS) {
    const { supabase, user } = await getSessionUser()
    if (!user) redirect('/login')

    const horizon = new Date()
    horizon.setDate(horizon.getDate() + 14)
    const horizonStr = horizon.toISOString().split('T')[0]

    const [{ data: p }, { data: c }, { data: notifRows }, { count }, { data: noteDeadlines }, { data: taskDeadlines }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('clients').select('id, name, status').order('name'),
      supabase.from('notifications').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_id', user.id).eq('is_read', false),
      supabase.from('client_notes').select('id, content, deadline, client_id, clients(name)').eq('author_id', user.id).eq('deadline_done', false).not('deadline', 'is', null).lte('deadline', horizonStr).order('deadline'),
      supabase.from('planner_tasks').select('id, task, deadline').eq('user_id', user.id).eq('status', 'open').not('deadline', 'is', null).lte('deadline', horizonStr).order('deadline'),
    ])

    if (!p) redirect('/login')
    profile = p
    clients = (c ?? []) as typeof clients
    notifications = (notifRows ?? []) as AppNotification[]
    unreadCount = count ?? 0

    const today = new Date().toISOString().split('T')[0]
    const fromNotes: UpcomingReminder[] = (noteDeadlines ?? []).map((n: any) => ({
      id: `note-${n.id}`,
      label: n.content,
      clientName: n.clients?.name ?? null,
      deadline: n.deadline,
      linkPath: `/clients/${n.client_id}#note-${n.id}`,
      overdue: n.deadline < today,
    }))
    const fromTasks: UpcomingReminder[] = (taskDeadlines ?? []).map((t: any) => ({
      id: `task-${t.id}`,
      label: t.task,
      clientName: null,
      deadline: t.deadline,
      linkPath: '/planner',
      overdue: t.deadline < today,
    }))
    upcoming = [...fromNotes, ...fromTasks].sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 10)
  } else {
    clients = MOCK_CLIENTS.map((c) => ({ id: c.id, name: c.name, status: c.status }))
  }

  if (!profile) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={profile} clients={clients} notifications={notifications} unreadCount={unreadCount} upcoming={upcoming} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
