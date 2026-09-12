'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createUseCaseAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return

  await supabase.from('use_cases').delete().eq('id', id)
  revalidatePath('/library')
}

export async function toggleClientUseCaseAction(
  clientId: string,
  useCaseId: string,
  isUsing: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('client_use_cases').upsert(
    { client_id: clientId, use_case_id: useCaseId, is_using: isUsing, updated_at: new Date().toISOString() },
    { onConflict: 'client_id,use_case_id' }
  )

  revalidatePath(`/clients/${clientId}`)
}
