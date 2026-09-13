'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        {pending ? 'Creating client…' : 'Create client & open plan'}
      </button>
      {!pending && (
        <Link
          href="/dashboard"
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Cancel
        </Link>
      )}
      {pending && (
        <span className="text-sm text-gray-400">Setting up the implementation plan…</span>
      )}
    </>
  )
}
