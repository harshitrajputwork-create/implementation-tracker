'use client'

import { useEffect } from 'react'

/** Scrolls the element matching the current URL hash into view and gives it a breathing pulse. */
export default function ScrollToHashHighlight() {
  useEffect(() => {
    const hash = window.location.hash?.slice(1)
    if (!hash) return

    const el = document.getElementById(hash)
    if (!el) return

    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('breathe-highlight')
      const cleanup = setTimeout(() => el.classList.remove('breathe-highlight'), 2400)
      return () => clearTimeout(cleanup)
    }, 150)

    return () => clearTimeout(t)
  }, [])

  return null
}
