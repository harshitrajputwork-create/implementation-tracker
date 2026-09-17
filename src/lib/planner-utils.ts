export interface ClientOption { id: string; name: string }

/** Matches typed text to a tracked client by exact name (case-insensitive) so it
 *  stays linked and clickable; anything else is just kept as a free-text label —
 *  requests come in about plenty of accounts that aren't in the tracker. */
export function resolveAccount(value: string, clients: ClientOption[]): { clientId: string | null; accountName: string | null } {
  const trimmed = value.trim()
  if (!trimmed) return { clientId: null, accountName: null }
  const match = clients.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())
  return match ? { clientId: match.id, accountName: null } : { clientId: null, accountName: trimmed }
}
