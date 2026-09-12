'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ClientStatus, StepStatus } from '@/lib/types'

export async function updateStepAction(
  stepId: string,
  clientId: string,
  status: StepStatus,
  realDate?: string
) {
  const supabase = await createClient()
  await supabase
    .from('plan_steps')
    .update({
      status,
      real_date_completed: status === 'done' ? (realDate ?? new Date().toISOString().split('T')[0]) : null,
    })
    .eq('id', stepId)

  revalidatePath(`/clients/${clientId}`)
}

export async function updateStepNotesAction(
  stepId: string,
  clientId: string,
  notes: string
) {
  const supabase = await createClient()
  await supabase
    .from('plan_steps')
    .update({ notes: notes || null })
    .eq('id', stepId)

  revalidatePath(`/clients/${clientId}`)
}

export async function updateClientStatusAction(
  clientId: string,
  status: ClientStatus
) {
  const supabase = await createClient()
  await supabase.from('clients').update({ status }).eq('id', clientId)
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/dashboard')
}

export async function addDeviationEntryAction(
  clientId: string,
  note: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !note.trim()) return

  await supabase.from('deviation_log').insert({
    client_id: clientId,
    author_id: user.id,
    note: note.trim(),
  })

  revalidatePath(`/clients/${clientId}`)
}

export async function setRolloutDateAction(
  clientId: string,
  confirmedDate: string,
  notes?: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('rollout_confirmations').upsert(
    {
      client_id: clientId,
      confirmed_date: confirmedDate,
      set_by: user.id,
      notes: notes || null,
    },
    { onConflict: 'client_id' }
  )

  revalidatePath(`/clients/${clientId}`)
}

export async function markHandedOverAction(
  clientId: string,
  kamName: string,
  handoverDate: string
) {
  const supabase = await createClient()
  await supabase
    .from('clients')
    .update({
      is_handed_over: true,
      status: 'handed_over' as ClientStatus,
      handed_over_to_kam: kamName.trim(),
      handover_date: handoverDate,
    })
    .eq('id', clientId)

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/dashboard')
}

export async function updateClientNotesAction(clientId: string, notes: string) {
  const supabase = await createClient()
  await supabase
    .from('clients')
    .update({ notes: notes || null })
    .eq('id', clientId)

  revalidatePath(`/clients/${clientId}`)
}
