import type { Role } from './types'

export interface TourStep {
  path?: string
  // Sequence of real, already-on-page elements to click through (each
  // waited for before clicking) to arrive at `selector` — used for steps
  // that drill into a real account instead of just describing the list.
  clickPath?: string[]
  selector: string
  title: string
  description: string
}

const FIRST_CLIENT_ROW = '[data-tour="dashboard-clients"] tbody tr.cursor-pointer'

// Steps every signed-in role sees, in order. Each targets a real element on
// a real page — the tour navigates the browser (via router.push, or by
// clicking through real elements already on the page), waits for the
// target to appear, then highlights it.
const CORE_STEPS: TourStep[] = [
  {
    path: '/dashboard',
    selector: '[data-tour="mode-toggle"]',
    title: 'Trial vs Implementation',
    description: 'This switch flips the whole app between two modes — Trial (accounts before they go live) and Implementation (live rollouts). Everything in the sidebar changes with it.',
  },
  {
    path: '/trial',
    selector: '[data-tour="trial-dashboard"]',
    title: 'Free Trial',
    description: 'Every trial account lives in this list — click any row (e.g. Mayave) to open it. Demo logins, the use case you\'re demoing, and notes all live on that account\'s page.',
  },
  {
    path: '/dashboard',
    selector: '[data-tour="dashboard-clients"]',
    title: 'Implementation clients',
    description: 'Same idea on the Implementation side — click any client row to open its 30-day plan, notes, and Growth tab.',
  },
  {
    path: '/dashboard',
    clickPath: [FIRST_CLIENT_ROW, '[data-tour="tab-growth"]'],
    selector: '[data-tour="growth-tab"]',
    title: 'Growth: use cases & exports',
    description: 'This client\'s Growth tab — use cases matched to its industry. Tick what they\'re already using. It feeds the Client Update and Journey Report PDF exports, including what they could explore next.',
  },
  {
    path: '/dashboard',
    clickPath: [FIRST_CLIENT_ROW, '[data-tour="tab-plan"]'],
    selector: '[data-tour="client-notes"]',
    title: 'Notes — team or personal',
    description: 'Log notes as Team (everyone sees) or Personal (just you), tag a teammate with @, and set a deadline. The latest note on every account also surfaces in your Planner.',
  },
]

const PLANNER_STEP: TourStep = {
  path: '/planner',
  selector: '[data-tour="planner-main"]',
  title: 'Planner & Activity',
  description: 'Use this like a notepad across every account — your own cross-account task list, plus the latest note from any client or trial account so you can see what happened last.',
}

const ADMIN_STEP: TourStep = {
  path: '/planner',
  selector: '[data-tour="admin-links"]',
  title: 'Use Cases & Settings',
  description: 'Use Cases is the admin-managed library behind each client\'s Growth tab. Settings covers team roles, dropdown options, and the default 30-day plan template.',
}

export function getTourSteps(role: Role): TourStep[] {
  const steps = [...CORE_STEPS, PLANNER_STEP]
  if (role === 'admin') steps.push(ADMIN_STEP)
  return steps
}
