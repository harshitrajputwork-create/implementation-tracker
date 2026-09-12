import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { IS_DEV_BYPASS, MOCK_PROFILE } from '@/lib/dev-mock'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let profile = IS_DEV_BYPASS ? MOCK_PROFILE : null

  if (!IS_DEV_BYPASS) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!p) redirect('/login')
    profile = p
  }

  if (!profile) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={profile} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
