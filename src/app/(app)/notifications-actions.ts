'use server'

import { getSessionUser } from '@/lib/supabase/server'
import type { AppNotification, UpcomingReminder } from '@/lib/types'

export async function markNotificationReadAction(notificationId: string) {
  const { supabase, user } = await getSessionUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('recipient_id', user.id)
}

export async function markAllNotificationsReadAction() {
  const { supabase, user } = await getSessionUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)
}

// Fetched client-side by the notification bell itself (on mount + on its own
// interval) so it never blocks the shared layout's render — the layout used
// to fetch this on every navigation, which added a joined-query round trip
// to every single page load and, via revalidatePath, after every mutation too.
export async function getNotificationsDataAction(): Promise<{
  notifications: AppNotification[]
  unreadCount: number
  upcoming: UpcomingReminder[]
}> {
  const { supabase, user } = await getSessionUser()
  if (!user) return { notifications: [], unreadCount: 0, upcoming: [] }

  const horizon = new Date()
  horizon.setDate(horizon.getDate() + 14)
  const horizonStr = horizon.toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const [{ data: notifRows }, { count }, { data: noteDeadlines }, { data: taskDeadlines }] = await Promise.all([
    supabase.from('notifications').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_id', user.id).eq('is_read', false),
    supabase.from('client_notes').select('id, content, deadline, client_id, clients(name)').eq('author_id', user.id).eq('deadline_done', false).not('deadline', 'is', null).lte('deadline', horizonStr).order('deadline'),
    supabase.from('planner_tasks').select('id, task, deadline').eq('user_id', user.id).eq('status', 'open').not('deadline', 'is', null).lte('deadline', horizonStr).order('deadline'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromNotes: UpcomingReminder[] = (noteDeadlines ?? []).map((n: any) => ({
    id: `note-${n.id}`,
    label: n.content,
    clientName: n.clients?.name ?? null,
    deadline: n.deadline,
    linkPath: `/clients/${n.client_id}#note-${n.id}`,
    overdue: n.deadline < today,
  }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromTasks: UpcomingReminder[] = (taskDeadlines ?? []).map((t: any) => ({
    id: `task-${t.id}`,
    label: t.task,
    clientName: null,
    deadline: t.deadline,
    linkPath: '/planner',
    overdue: t.deadline < today,
  }))

  return {
    notifications: (notifRows ?? []) as AppNotification[],
    unreadCount: count ?? 0,
    upcoming: [...fromNotes, ...fromTasks].sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 10),
  }
}
