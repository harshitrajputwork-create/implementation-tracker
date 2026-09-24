// Shared account-size tiers — used by clients' "Ticket size" and trial
// accounts' "Size of account" pickers so both look and mean the same thing.
export const TICKET_SIZES = ['Small', 'Medium', 'Large', 'XL']

export const TICKET_SIZE_COLOR: Record<string, string> = {
  Small:  'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Large:  'bg-green-100 text-green-700 border-green-200',
  XL:     'bg-teal-600 text-white border-teal-600',
}
