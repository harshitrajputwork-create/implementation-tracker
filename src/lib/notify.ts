// Server-side helper for creating @mention notifications. Imported only from
// 'use server' action files — never called directly from client components.

export async function notifyMentions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  mentionedIds: string[],
  actorId: string,
  actorName: string,
  opts: {
    // Exactly one of these should be set — notifications.client_id and
    // .trial_account_id each carry their own FK, so a trial account's id
    // must never be written into client_id (it isn't a row in clients).
    clientId?: string
    trialAccountId?: string
    clientName: string
    context: string
    preview: string
    linkPath: string
  },
) {
  const targets = [...new Set(mentionedIds)].filter((id) => id && id !== actorId)
  if (targets.length === 0) return

  const rows = targets.map((recipient_id) => ({
    recipient_id,
    actor_id: actorId,
    actor_name: actorName,
    type: 'mention' as const,
    client_id: opts.clientId ?? null,
    trial_account_id: opts.trialAccountId ?? null,
    client_name: opts.clientName,
    context: opts.context,
    preview: opts.preview.slice(0, 160),
    link_path: opts.linkPath,
  }))

  await supabase.from('notifications').insert(rows)
}
