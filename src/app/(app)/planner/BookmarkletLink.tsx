'use client'

import { useEffect, useState } from 'react'
import { Bookmark } from 'lucide-react'

export default function BookmarkletLink() {
  const [href, setHref] = useState('')

  useEffect(() => {
    const origin = window.location.origin
    const code = `(function(){var w=420,h=560;window.open('${origin}/quick?popup=1','quicknote','width='+w+',height='+h+',left='+(screen.width/2-w/2)+',top='+(screen.height/2-h/2));})();`
    setHref(`javascript:${encodeURIComponent(code)}`)
  }, [])

  if (!href) return null

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <Bookmark className="w-3.5 h-3.5 flex-shrink-0" />
      <span>
        Drag{' '}
        <a
          href={href}
          onClick={(e) => e.preventDefault()}
          className="inline-block px-2 py-0.5 bg-white border border-gray-300 rounded-md text-gray-700 font-medium cursor-grab active:cursor-grabbing hover:border-blue-400 hover:text-blue-600"
        >
          📝 Quick Note
        </a>{' '}
        to your bookmarks bar — click it from anywhere to jot a note straight into your Planner.
      </span>
    </div>
  )
}
