export interface ClientOption { id: string; name: string }

/** Matches typed text to a tracked client or trial account by exact name
 *  (case-insensitive) so it stays linked and clickable; anything else is
 *  just kept as a free-text label — requests come in about plenty of
 *  accounts that aren't tracked either way. Clients are checked first. */
export function resolveAccount(
  value: string,
  clients: ClientOption[],
  trials: ClientOption[] = [],
): { clientId: string | null; trialAccountId: string | null; accountName: string | null } {
  const trimmed = value.trim()
  if (!trimmed) return { clientId: null, trialAccountId: null, accountName: null }
  const client = clients.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())
  if (client) return { clientId: client.id, trialAccountId: null, accountName: null }
  const trial = trials.find((t) => t.name.toLowerCase() === trimmed.toLowerCase())
  if (trial) return { clientId: null, trialAccountId: trial.id, accountName: null }
  return { clientId: null, trialAccountId: null, accountName: trimmed }
}
