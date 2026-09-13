'use server'

import { getSessionUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Role } from '@/lib/types'

export async function inviteUserAction(email: string, role: Role) {
  const { supabase, user } = await getSessionUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: 'Admin only' }

  const trimmed = email.trim().toLowerCase()
  if (!trimmed) return { error: 'Email required' }

  const { error } = await supabase.from('invitations').upsert(
    { email: trimmed, role, invited_by: user.id, accepted: false },
    { onConflict: 'email' }
  )

  if (error) return { error: error.message }
  revalidatePath('/team')
  return { ok: true }
}

export async function updateUserRoleAction(profileId: string, role: Role) {
  const { supabase, user } = await getSessionUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: 'Admin only' }

  await supabase.from('profiles').update({ role }).eq('id', profileId)
  revalidatePath('/team')
  return { ok: true }
}

export async function revokeInvitationAction(invitationId: string) {
  const { supabase, user } = await getSessionUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: 'Admin only' }

  await supabase.from('invitations').delete().eq('id', invitationId)
  revalidatePath('/team')
  return { ok: true }
}
