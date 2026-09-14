'use server'

import { createClient, getSessionUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ClientStatus, StepStatus, DeviationCause } from '@/lib/types'

type SB = Awaited<ReturnType<typeof createClient>>

async function touchActivity(supabase: SB, clientId: string) {
  await supabase
    .from('clients')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', clientId)
}

async function logAction(supabase: SB, clientId: string, userId: string, action: string, detail?: string) {
  const { data: p } = await supabase
    .from('profiles').select('full_name').eq('id', userId).single()
  await supabase.from('activity_log').insert({
    client_id: clientId,
    user_id: userId,
    user_name: p?.full_name ?? 'Unknown',
    action,
    detail: detail ?? null,
  })
}

export async function updateStepAction(
  stepId: string,
  clientId: string,
  status: StepStatus,
  realDate?: string,
) {
  const { supabase, user } = await getSessionUser()

  const { data: step } = await supabase
    .from('plan_steps').select('step_name').eq('id', stepId).single()

  await supabase
    .from('plan_steps')
    .update({
      status,
      real_date_completed: status === 'done'
        ? (realDate ?? new Date().toISOString().split('T')[0])
        : null,
    })
    .eq('id', stepId)

  if (user) {
    const label = status === 'done' ? 'marked step done'
      : status === 'in_progress' ? 'started step'
      : 'reset step'
    await logAction(supabase, clientId, user.id, label, step?.step_name ?? undefined)
  }
  await touchActivity(supabase, clientId)
  revalidatePath(`/clients/${clientId}`)
}

export async function updateStepNotesAction(
  stepId: string,
  clientId: string,
  notes: string,
  clientVisible: boolean = false,
) {
  const { supabase, user } = await getSessionUser()

  await supabase
    .from('plan_steps')
    .update({ notes: notes || null, notes_client_visible: clientVisible })
    .eq('id', stepId)

  if (user) await logAction(supabase, clientId, user.id, 'updated step notes')
  await touchActivity(supabase, clientId)
  revalidatePath(`/clients/${clientId}`)
}

export async function updateStepConfigAction(
  stepId: string,
  clientId: string,
  stepName: string,
  dayRange: string,
) {
  const { supabase, user } = await getSessionUser()

  await supabase
    .from('plan_steps')
    .update({ step_name: stepName.trim(), ideated_day_range: dayRange.trim() })
    .eq('id', stepId)

  if (user) await logAction(supabase, clientId, user.id, 'edited step', stepName.trim())
  await touchActivity(supabase, clientId)
  revalidatePath(`/clients/${clientId}`)
}

export async function updateClientStatusAction(
  clientId: string,
  statusOverride: ClientStatus | null,
) {
  const { supabase, user } = await getSessionUser()

  await supabase
    .from('clients')
    .update({ status_override: statusOverride })
    .eq('id', clientId)

  if (user) await logAction(supabase, clientId, user.id, 'changed status', statusOverride ?? 'auto')
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/dashboard')
}

export async function addDeviationEntryAction(
  clientId: string,
  note: string,
  cause: DeviationCause,
  clientVisible: boolean = false,
) {
  const { supabase, user } = await getSessionUser()
  if (!user || !note.trim()) return

  await supabase.from('deviation_log').insert({
    client_id: clientId,
    author_id: user.id,
    note: note.trim(),
    cause,
    client_visible: clientVisible,
  })

  await logAction(supabase, clientId, user.id, 'added deviation note')
  await touchActivity(supabase, clientId)
  revalidatePath(`/clients/${clientId}`)
}

export async function setRolloutDateAction(
  clientId: string,
  confirmedDate: string,
  notes?: string,
) {
  const { supabase, user } = await getSessionUser()
  if (!user) return

  await supabase.from('rollout_confirmations').upsert(
    { client_id: clientId, confirmed_date: confirmedDate, set_by: user.id, notes: notes || null },
    { onConflict: 'client_id' },
  )

  await logAction(supabase, clientId, user.id, 'set rollout date', confirmedDate)
  await touchActivity(supabase, clientId)
  revalidatePath(`/clients/${clientId}`)
}

export async function markHandedOverAction(
  clientId: string,
  kamName: string,
  handoverDate: string,
) {
  const { supabase, user } = await getSessionUser()

  await supabase
    .from('clients')
    .update({
      is_handed_over: true,
      status_override: 'handed_over' as ClientStatus,
      handed_over_to_kam: kamName.trim(),
      handover_date: handoverDate,
    })
    .eq('id', clientId)

  if (user) await logAction(supabase, clientId, user.id, 'handed over to KAM', kamName)
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/dashboard')
}

export async function updateClientNotesAction(clientId: string, notes: string) {
  const { supabase, user } = await getSessionUser()

  await supabase.from('clients').update({ notes: notes || null }).eq('id', clientId)

  if (user) await logAction(supabase, clientId, user.id, 'updated client notes')
  revalidatePath(`/clients/${clientId}`)
}

export async function updateClientMetaAction(
  clientId: string,
  fields: {
    name?: string
    industry?: string | null
    company_size?: string | null
    owner_id?: string | null
    kickoff_date?: string | null
    notes?: string | null
    ticket_size?: string | null
    sales_spoc?: string | null
    country?: string | null
    modules?: string[]
    account_url?: string | null
  },
) {
  const { supabase, user } = await getSessionUser()
  if (!user) return

  await supabase.from('clients').update(fields).eq('id', clientId)

  if (user) await logAction(supabase, clientId, user.id, 'updated client details')
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/dashboard')
}

export async function deleteClientAction(clientId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getSessionUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Only admins can delete clients' }

  const { error, count } = await supabase
    .from('clients')
    .delete({ count: 'exact' })
    .eq('id', clientId)

  if (error) return { error: error.message }
  if (!count) return { error: 'Delete was blocked — no rows removed' }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

// ── Client SPOCs ──────────────────────────────────────────────────────────────

export async function addSpocAction(
  clientId: string,
  fields: { name: string; email?: string; department?: string; notes?: string },
) {
  const { supabase, user } = await getSessionUser()
  if (!user) return

  const { data: last } = await supabase
    .from('client_spocs').select('sort_order').eq('client_id', clientId)
    .order('sort_order', { ascending: false }).limit(1)
  const order = last && last.length > 0 ? last[0].sort_order + 1 : 1

  await supabase.from('client_spocs').insert({
    client_id: clientId,
    name: fields.name.trim(),
    email: fields.email?.trim() || null,
    department: fields.department?.trim() || null,
    notes: fields.notes?.trim() || null,
    sort_order: order,
  })
  revalidatePath(`/clients/${clientId}`)
}

export async function updateSpocAction(
  spocId: string,
  clientId: string,
  fields: { name: string; email?: string; department?: string; notes?: string },
) {
  const { supabase, user } = await getSessionUser()
  if (!user) return

  await supabase.from('client_spocs').update({
    name: fields.name.trim(),
    email: fields.email?.trim() || null,
    department: fields.department?.trim() || null,
    notes: fields.notes?.trim() || null,
  }).eq('id', spocId)
  revalidatePath(`/clients/${clientId}`)
}

export async function deleteSpocAction(spocId: string, clientId: string) {
  const { supabase, user } = await getSessionUser()
  if (!user) return
  await supabase.from('client_spocs').delete().eq('id', spocId)
  revalidatePath(`/clients/${clientId}`)
}

// ── Personal notes ────────────────────────────────────────────────────────────

export async function upsertPersonalNoteAction(clientId: string, content: string) {
  const { supabase, user } = await getSessionUser()
  if (!user) return

  await supabase.from('personal_notes').upsert(
    { client_id: clientId, user_id: user.id, content, updated_at: new Date().toISOString() },
    { onConflict: 'client_id,user_id' },
  )
}
