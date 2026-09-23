import { getSessionUser } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ScrollToHashHighlight from '@/components/ScrollToHashHighlight'
import TrialDetailClient from './TrialDetailClient'
import { IS_DEV_BYPASS } from '@/lib/dev-mock'
import type { TrialAccount, ClientNoteEntry, ConfigOption, Profile } from '@/lib/types'

export default async function TrialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (IS_DEV_BYPASS) notFound()

  const { supabase, user } = await getSessionUser()
  if (!user) redirect('/login')

  const [{ data: trial }, { data: notesRows }, { data: opts }, { data: members }] = await Promise.all([
    supabase.from('trial_accounts').select('*, owner:profiles!owner_id(id, full_name, email, role)').eq('id', id).single(),
    supabase.from('client_notes').select('*').eq('trial_account_id', id).order('created_at', { ascending: false }),
    supabase.from('config_options').select('*').order('sort_order'),
    supabase.from('profiles').select('id, full_name, email, role').in('role', ['admin', 'member']).order('full_name'),
  ])

  if (!trial) notFound()

  const typedTrial = trial as TrialAccount
  const notes = (notesRows ?? []) as ClientNoteEntry[]
  const configOptions = (opts ?? []) as ConfigOption[]

  return (
    <div className="p-8 max-w-3xl">
      <ScrollToHashHighlight />
      <Link href="/trial" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5 w-fit">
        <ChevronLeft className="w-4 h-4" />
        Free Trial
      </Link>

      <TrialDetailClient
        trial={typedTrial}
        notes={notes}
        currentUserId={user.id}
        configOptions={configOptions}
        members={(members ?? []) as Profile[]}
      />
    </div>
  )
}
