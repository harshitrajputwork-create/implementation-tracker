'use server'

import { getSessionUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markNotificationReadAction(notificationId: string) {
  const { supabase, user } = await getSessionUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('recipient_id', user.id)

  revalidatePath('/', 'layout')
}

export async function markAllNotificationsReadAction() {
  const { supabase, user } = await getSessionUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)

  revalidatePath('/', 'layout')
}
