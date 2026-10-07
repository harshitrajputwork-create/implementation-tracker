'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { driver, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { getTourSteps } from '@/lib/onboarding-steps'
import type { Role } from '@/lib/types'

const STORAGE_KEY = 'onboarding_tour_done_v1'

// Steps that highlight something inside the sidebar read better with the
// sidebar fully expanded (text labels visible, not just icons).
const SIDEBAR_SELECTORS = ['[data-tour="mode-toggle"]', '[data-tour="admin-links"]', '[data-tour="notif-bell"]']

function setSidebarExpanded(expanded: boolean) {
  window.dispatchEvent(new CustomEvent('onboarding:sidebar', { detail: { expanded } }))
}

function waitForElement(selector: string, timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now()
    function check() {
      if (document.querySelector(selector)) { resolve(true); return }
      if (Date.now() - start > timeoutMs) { resolve(false); return }
      requestAnimationFrame(check)
    }
    check()
  })
}

export default function OnboardingTour({ role }: { role: Role }) {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  const driverRef = useRef<Driver | null>(null)
  const stepsRef = useRef(getTourSteps(role))

  useEffect(() => { pathnameRef.current = pathname }, [pathname])

  async function goToStep(index: number) {
    const steps = stepsRef.current
    const step = steps[index]
    if (!step || !driverRef.current) return
    setSidebarExpanded(SIDEBAR_SELECTORS.includes(step.selector))

    if (step.clickPath && step.clickPath.length > 0) {
      // Navigate to the starting page (if needed), then click through real,
      // already-on-page elements one at a time — same path a person would
      // actually take (e.g. click a client row, then its Growth tab).
      if (step.path && pathnameRef.current !== step.path) {
        router.push(step.path)
      }
      for (const sel of step.clickPath) {
        const found = await waitForElement(sel)
        if (!found) break
        ;(document.querySelector(sel) as HTMLElement | null)?.click()
      }
      await waitForElement(step.selector)
    } else if (step.path) {
      if (pathnameRef.current !== step.path) {
        router.push(step.path)
        await waitForElement(step.selector)
      } else {
        await waitForElement(step.selector, 1000)
      }
    }

    driverRef.current.drive(index)
  }

  function finish() {
    driverRef.current?.destroy()
    setSidebarExpanded(false)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
  }

  function start() {
    driverRef.current?.destroy()
    const steps = stepsRef.current

    const d = driver({
      showProgress: true,
      allowClose: true,
      overlayOpacity: 0.6,
      stagePadding: 6,
      stageRadius: 8,
      steps: steps.map((s) => ({
        element: s.selector,
        popover: { title: s.title, description: s.description },
      })),
      onNextClick: (_el, _step, opts) => {
        const next = (opts.state.activeIndex ?? 0) + 1
        if (next >= steps.length) { finish(); return }
        goToStep(next)
      },
      onPrevClick: (_el, _step, opts) => {
        const prev = (opts.state.activeIndex ?? 0) - 1
        if (prev < 0) return
        goToStep(prev)
      },
      onDoneClick: finish,
      onCloseClick: finish,
      onDestroyed: () => {
        try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
      },
    })

    driverRef.current = d
    goToStep(0)
  }

  // "Replay tour" (Sidebar) dispatches this.
  useEffect(() => {
    function onReplay() { start() }
    window.addEventListener('onboarding:start', onReplay)
    return () => window.removeEventListener('onboarding:start', onReplay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-start once, first time this browser ever lands on the app.
  useEffect(() => {
    let done = true
    try { done = !!localStorage.getItem(STORAGE_KEY) } catch {}
    if (done) return
    const t = setTimeout(() => start(), 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
