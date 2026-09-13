'use server'

import { getSessionUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const { supabase, user } = await getSessionUser()
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

export async function addConfigOptionAction(configKey: string, label: string) {
  const supabase = await assertAdmin()
  const { data: rows } = await supabase
    .from('config_options')
    .select('sort_order')
    .eq('config_key', configKey)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = rows && rows.length > 0 ? rows[0].sort_order + 1 : 1
  await supabase.from('config_options').insert({ config_key: configKey, label: label.trim(), sort_order: nextOrder })
  revalidatePath('/config')
}

export async function updateConfigOptionAction(id: string, label: string) {
  const supabase = await assertAdmin()
  await supabase.from('config_options').update({ label: label.trim() }).eq('id', id)
  revalidatePath('/config')
}

export async function deleteConfigOptionAction(id: string) {
  const supabase = await assertAdmin()
  await supabase.from('config_options').delete().eq('id', id)
  revalidatePath('/config')
}
