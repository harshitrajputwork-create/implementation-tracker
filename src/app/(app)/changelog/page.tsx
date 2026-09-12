import { CHANGELOG } from '@/lib/changelog'
import Link from 'next/link'
import { ChevronLeft, Sparkles } from 'lucide-react'

export default function ChangelogPage() {
  return (
    <div className="p-8 max-w-2xl">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 w-fit"
      >
        <ChevronLeft className="w-4 h-4" />
        Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">What&apos;s New</h1>
          <p className="text-gray-500 text-sm">Implementation Tracker release notes</p>
        </div>
      </div>

      <div className="space-y-10">
        {CHANGELOG.map((entry, i) => (
          <div key={entry.version} className="relative pl-6">
            {/* timeline line */}
            {i < CHANGELOG.length - 1 && (
              <div className="absolute left-2 top-6 bottom-0 w-px bg-gray-200" />
            )}
            {/* dot */}
            <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-blue-600 bg-white" />

            <div className="mb-2">
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {entry.version}
              </span>
              <span className="text-xs text-gray-400 ml-2">
                {new Date(entry.date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

            <ul className="space-y-1.5 mt-3">
              {entry.changes.map((change, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-gray-300 mt-0.5 flex-shrink-0">·</span>
                  {change}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
