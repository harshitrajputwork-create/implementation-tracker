'use server'

import { getSessionUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TaskPriority } from '@/lib/types'

export async function addPlannerTaskAction(fields: {
  team?: string
  person?: string
  clientId?: string | null
  trialAccountId?: string | null
  accountName?: string | null
  task: string
  priority: TaskPriority
  deadline?: string | null
}): Promise<{ error?: string }> {
  const { supabase, user } = await getSessionUser()
  if (!user) return { error: 'Not authenticated' }
  if (!fields.task.trim()) return { error: 'Task text is required' }

  const { error } = await supabase.from('planner_tasks').insert({
    user_id: user.id,
    team: fields.team?.trim() || null,
    person: fields.person?.trim() || null,
    client_id: fields.clientId || null,
    trial_account_id: fields.trialAccountId || null,
    account_name: fields.accountName?.trim() || null,
    task: fields.task.trim(),
    priority: fields.priority,
    deadline: fields.deadline || null,
  })

  if (error) return { error: error.message }

  revalidatePath('/planner')
  return {}
}

export async function updatePlannerTaskAction(
  taskId: string,
  fields: {
    team?: string | null
    person?: string | null
    clientId?: string | null
    trialAccountId?: string | null
    accountName?: string | null
    task?: string
    priority?: TaskPriority
    deadline?: string | null
  },
): Promise<{ error?: string }> {
  const { supabase, user } = await getSessionUser()
  if (!user) return { error: 'Not authenticated' }

  const payload: Record<string, unknown> = {}
  if (fields.team !== undefined) payload.team = fields.team?.trim() || null
  if (fields.person !== undefined) payload.person = fields.person?.trim() || null
  if (fields.clientId !== undefined) payload.client_id = fields.clientId || null
  if (fields.trialAccountId !== undefined) payload.trial_account_id = fields.trialAccountId || null
  if (fields.accountName !== undefined) payload.account_name = fields.accountName?.trim() || null
  if (fields.task !== undefined) payload.task = fields.task.trim()
  if (fields.priority !== undefined) payload.priority = fields.priority
  if (fields.deadline !== undefined) payload.deadline = fields.deadline || null

  const { error } = await supabase.from('planner_tasks').update(payload).eq('id', taskId).eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/planner')
  return {}
}

export async function togglePlannerTaskAction(taskId: string, done: boolean) {
  const { supabase, user } = await getSessionUser()
  if (!user) return
  await supabase.from('planner_tasks').update({ status: done ? 'done' : 'open' }).eq('id', taskId).eq('user_id', user.id)
  revalidatePath('/planner')
}

export async function deletePlannerTaskAction(taskId: string) {
  const { supabase, user } = await getSessionUser()
  if (!user) return
  await supabase.from('planner_tasks').delete().eq('id', taskId).eq('user_id', user.id)
  revalidatePath('/planner')
}
