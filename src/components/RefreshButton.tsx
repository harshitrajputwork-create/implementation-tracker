'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export default function RefreshButton() {
  const router = useRouter()
  const [isPending, start] = useTransition()

  return (
    <button
      onClick={() => start(() => router.refresh())}
      disabled={isPending}
      title="Refresh"
      className="flex items-center justify-center p-2.5 border border-gray-300 text-gray-500 rounded-xl hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-60"
    >
      <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
    </button>
  )
}
