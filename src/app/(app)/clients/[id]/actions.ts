'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ClientStatus, StepStatus, DeviationCause } from '@/lib/types'

async function touchActivity(supabase: Awaited<ReturnType<typeof createClient>>, clientId: string) {
  await supabase
    .from('clients')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', clientId)
}

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

  await touchActivity(supabase, clientId)
  revalidatePath(`/clients/${clientId}`)
}

export async function updateStepNotesAction(
  stepId: string,
  clientId: string,
  notes: string,
  clientVisible: boolean = false
) {
  const supabase = await createClient()
  await supabase
    .from('plan_steps')
    .update({ notes: notes || null, notes_client_visible: clientVisible })
    .eq('id', stepId)

  await touchActivity(supabase, clientId)
  revalidatePath(`/clients/${clientId}`)
}

export async function updateClientStatusAction(
  clientId: string,
  statusOverride: ClientStatus | null
) {
  const supabase = await createClient()
  await supabase
    .from('clients')
    .update({ status_override: statusOverride })
    .eq('id', clientId)
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/dashboard')
}

export async function addDeviationEntryAction(
  clientId: string,
  note: string,
  cause: DeviationCause,
  clientVisible: boolean = false
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

  await touchActivity(supabase, clientId)
  revalidatePath(`/clients/${clientId}`)
}

export async function setRolloutDateAction(
  clientId: string,
  confirmedDate: string,
  notes?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

  await touchActivity(supabase, clientId)
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
      status_override: 'handed_over' as ClientStatus,
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
