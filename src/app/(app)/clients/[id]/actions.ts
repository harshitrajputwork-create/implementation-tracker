'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
  },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('clients').update(fields).eq('id', clientId)

  if (user) await logAction(supabase, clientId, user.id, 'updated client details')
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/dashboard')
}
