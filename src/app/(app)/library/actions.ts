'use server'

import { getSessionUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { UseCaseExampleAccount } from '@/lib/types'

export async function createUseCaseAction(formData: FormData) {
  const { supabase, user } = await getSessionUser()
  if (!user) return

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return

  await supabase.from('use_cases').insert({
    title:        (formData.get('title') as string).trim(),
    description:  (formData.get('description') as string | null)?.trim() || null,
    industry_tag: (formData.get('industry_tag') as string | null) || null,
    link:         (formData.get('link') as string | null)?.trim() || null,
    created_by:   user.id,
  })

  revalidatePath('/library')
}

export async function deleteUseCaseAction(id: string) {
  const { supabase, user } = await getSessionUser()
  if (!user) return

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return

  await supabase.from('use_cases').delete().eq('id', id)
  revalidatePath('/library')
}

// Live example accounts (name + account URL) that implementers can point to
// when demoing this use case — shown both in the library and on a matching
// client's Growth tab.
export async function addExampleAccountAction(
  useCaseId: string,
  name: string,
  url: string,
  checklistTitle?: string,
  formId?: string,
) {
  const { supabase, user } = await getSessionUser()
  if (!user) return
  if (!name.trim() || !url.trim()) return

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return

  const { data: uc } = await supabase.from('use_cases').select('example_accounts').eq('id', useCaseId).single()
  const existing = (uc?.example_accounts as UseCaseExampleAccount[] | null) ?? []
  const entry: UseCaseExampleAccount = { name: name.trim(), url: url.trim() }
  if (checklistTitle?.trim()) entry.checklistTitle = checklistTitle.trim()
  if (formId?.trim()) entry.formId = formId.trim()
  const next = [...existing.filter((a) => a.name !== name.trim()), entry]

  await supabase.from('use_cases').update({ example_accounts: next }).eq('id', useCaseId)
  revalidatePath('/library')
}

export async function removeExampleAccountAction(useCaseId: string, name: string) {
  const { supabase, user } = await getSessionUser()
  if (!user) return

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return

  const { data: uc } = await supabase.from('use_cases').select('example_accounts').eq('id', useCaseId).single()
  const existing = (uc?.example_accounts as UseCaseExampleAccount[] | null) ?? []
  const next = existing.filter((a) => a.name !== name)

  await supabase.from('use_cases').update({ example_accounts: next }).eq('id', useCaseId)
  revalidatePath('/library')
}

export async function toggleClientUseCaseAction(
  clientId: string,
  useCaseId: string,
  isUsing: boolean
) {
  const { supabase, user } = await getSessionUser()
  if (!user) return

  await supabase.from('client_use_cases').upsert(
    { client_id: clientId, use_case_id: useCaseId, is_using: isUsing, updated_at: new Date().toISOString() },
    { onConflict: 'client_id,use_case_id' }
  )

  revalidatePath(`/clients/${clientId}`)
}
