import { getSessionUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Users, Mail, Shield } from 'lucide-react'
import type { Profile, Invitation, Role } from '@/lib/types'
import { IS_DEV_BYPASS, MOCK_PROFILE, MOCK_MEMBERS } from '@/lib/dev-mock'
import TeamClient from './TeamClient'

export default async function TeamPage() {
  let myRole: Role = 'admin'
  let members: Profile[] = []
  let invitations: Invitation[] = []

  if (IS_DEV_BYPASS) {
    myRole = MOCK_PROFILE.role
    members = MOCK_MEMBERS
    invitations = []
  } else {
    const { supabase, user } = await getSessionUser()
    if (!user) redirect('/login')

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    myRole = (me?.role as Role) ?? 'visitor'
    if (myRole !== 'admin') redirect('/dashboard')

    const { data: m } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true })
    members = (m ?? []) as Profile[]

    const { data: inv } = await supabase
      .from('invitations')
      .select('*')
      .eq('accepted', false)
      .order('created_at', { ascending: false })
    invitations = (inv ?? []) as Invitation[]
  }

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 w-fit"
      >
        <ChevronLeft className="w-4 h-4" />
        Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 text-sm">{members.length} people · Admin-only page</p>
        </div>
      </div>

      <TeamClient members={members} invitations={invitations} />
    </div>
  )
}
