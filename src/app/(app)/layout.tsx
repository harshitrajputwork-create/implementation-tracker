import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { IS_DEV_BYPASS, MOCK_PROFILE, MOCK_CLIENTS } from '@/lib/dev-mock'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let profile = IS_DEV_BYPASS ? MOCK_PROFILE : null
  let clients: { id: string; name: string; status: string }[] = []

  if (!IS_DEV_BYPASS) {
    const { supabase, user } = await getSessionUser()
    if (!user) redirect('/login')

    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('clients').select('id, name, status').order('name'),
    ])

    if (!p) redirect('/login')
    profile = p
    clients = (c ?? []) as typeof clients
  } else {
    clients = MOCK_CLIENTS.map((c) => ({ id: c.id, name: c.name, status: c.status }))
  }

  if (!profile) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={profile} clients={clients} />
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pt-14 md:pt-0">{children}</main>
    </div>
  )
}
