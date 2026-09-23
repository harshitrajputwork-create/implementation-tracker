'use server'

import { getSessionUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { notifyMentions } from '@/lib/notify'
import type { TrialStatus } from '@/lib/types'

export async function addTrialAccountAction(fields: {
  name: string
  trialUrl?: string
  salesSpoc?: string
  country?: string
  tzOffset?: string
  trialStartDate?: string
}): Promise<{ error?: string; id?: string }> {
  const { supabase, user } = await getSessionUser()
  if (!user) return { error: 'Not authenticated' }
  if (!fields.name.trim()) return { error: 'Name is required' }

  const { data, error } = await supabase
    .from('trial_accounts')
    .insert({
      name: fields.name.trim(),
      trial_url: fields.trialUrl?.trim() || null,
      sales_spoc: fields.salesSpoc || null,
      country: fields.country || null,
      tz_offset: fields.tzOffset || null,
      trial_start_date: fields.trialStartDate || null,
      owner_id: user.id,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/trial')
  return { id: data?.id }
}

export async function updateTrialAccountAction(
  id: string,
  fields: {
    name?: string
    trialUrl?: string | null
    salesSpoc?: string | null
    country?: string | null
    tzOffset?: string | null
    status?: TrialStatus
    trialStartDate?: string | null
    trialEndDate?: string | null
    ownerId?: string | null
  },
): Promise<{ error?: string }> {
  const { supabase, user } = await getSessionUser()
  if (!user) return { error: 'Not authenticated' }

  const payload: Record<string, unknown> = {}
  if (fields.name !== undefined) payload.name = fields.name.trim()
  if (fields.trialUrl !== undefined) payload.trial_url = fields.trialUrl?.trim() || null
  if (fields.salesSpoc !== undefined) payload.sales_spoc = fields.salesSpoc || null
  if (fields.country !== undefined) payload.country = fields.country || null
  if (fields.tzOffset !== undefined) payload.tz_offset = fields.tzOffset || null
  if (fields.status !== undefined) payload.status = fields.status
  if (fields.trialStartDate !== undefined) payload.trial_start_date = fields.trialStartDate || null
  if (fields.trialEndDate !== undefined) payload.trial_end_date = fields.trialEndDate || null
  if (fields.ownerId !== undefined) payload.owner_id = fields.ownerId || null

  const { error } = await supabase.from('trial_accounts').update(payload).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/trial')
  revalidatePath(`/trial/${id}`)
  return {}
}

export async function deleteTrialAccountAction(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getSessionUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: 'Admin only' }

  await supabase.from('trial_accounts').delete().eq('id', id)
  revalidatePath('/trial')
  redirect('/trial')
}

// ── Trial notes (client_notes rows with trial_account_id, always team-visible) ──

export async function addTrialNoteAction(
  trialAccountId: string,
  content: string,
  deadline: string | null,
  mentionedIds: string[] = [],
) {
  const { supabase, user } = await getSessionUser()
  if (!user || !content.trim()) return

  const [{ data: p }, { data: trial }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
    supabase.from('trial_accounts').select('name').eq('id', trialAccountId).single(),
  ])
  const authorName = p?.full_name ?? p?.email ?? 'Someone'

  const { data: inserted } = await supabase
    .from('client_notes')
    .insert({
      trial_account_id: trialAccountId,
      author_id: user.id,
      author_name: authorName,
      content: content.trim(),
      is_personal: false,
      deadline: deadline || null,
      mentioned_ids: mentionedIds,
    })
    .select('id')
    .single()

  if (mentionedIds.length > 0) {
    await notifyMentions(supabase, mentionedIds, user.id, authorName, {
      clientId: trialAccountId,
      clientName: trial?.name ?? 'a trial account',
      context: 'Trial note',
      preview: content.trim(),
      linkPath: `/trial/${trialAccountId}#note-${inserted ? inserted.id : ''}`,
    })
  }

  revalidatePath(`/trial/${trialAccountId}`)
  revalidatePath('/planner')
}

export async function deleteTrialNoteAction(noteId: string, trialAccountId: string) {
  const { supabase, user } = await getSessionUser()
  if (!user) return
  await supabase.from('client_notes').delete().eq('id', noteId).eq('author_id', user.id)
  revalidatePath(`/trial/${trialAccountId}`)
  revalidatePath('/planner')
}

export async function toggleTrialNoteDeadlineDoneAction(noteId: string, trialAccountId: string, done: boolean) {
  const { supabase, user } = await getSessionUser()
  if (!user) return
  await supabase.from('client_notes').update({ deadline_done: done }).eq('id', noteId).eq('author_id', user.id)
  revalidatePath(`/trial/${trialAccountId}`)
  revalidatePath('/planner')
}
