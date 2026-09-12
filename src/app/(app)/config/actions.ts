'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'admin') throw new Error('Forbidden')
  return supabase
}

export async function updateTemplateStepAction(
  id: string,
  stepName: string,
  dayRange: string,
  description: string,
) {
  const supabase = await assertAdmin()
  await supabase
    .from('step_templates')
    .update({ step_name: stepName.trim(), ideated_day_range: dayRange.trim(), description: description.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/config')
}

export async function deleteTemplateStepAction(id: string) {
  const supabase = await assertAdmin()
  await supabase.from('step_templates').delete().eq('id', id)
  revalidatePath('/config')
}

export async function addTemplateStepAction(stepName: string, dayRange: string, description: string) {
  const supabase = await assertAdmin()
  const { data: rows } = await supabase
    .from('step_templates')
    .select('step_order')
    .order('step_order', { ascending: false })
    .limit(1)
  const nextOrder = rows && rows.length > 0 ? rows[0].step_order + 1 : 1
  await supabase.from('step_templates').insert({
    step_name: stepName.trim(),
    ideated_day_range: dayRange.trim(),
    description: description.trim(),
    step_order: nextOrder,
  })
  revalidatePath('/config')
}

export async function reorderTemplateStepsAction(ids: string[]) {
  const supabase = await assertAdmin()
  await Promise.all(
    ids.map((id, i) =>
      supabase.from('step_templates').update({ step_order: i + 1 }).eq('id', id),
    ),
  )
  revalidatePath('/config')
}
