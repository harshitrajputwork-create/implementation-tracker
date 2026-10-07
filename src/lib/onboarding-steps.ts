import type { Role } from './types'

export interface TourStep {
  path: string
  selector: string
  title: string
  description: string
}

// Steps every signed-in role sees, in order. Each targets a real element on
// a real page — the tour navigates the browser to `path`, waits for
// `selector` to appear, then highlights it.
const CORE_STEPS: TourStep[] = [
  {
    path: '/dashboard',
    selector: '[data-tour="dashboard-overview"]',
    title: 'Dashboard',
    description: 'Your active Implementation clients at a glance — counts of On Track, At Risk and Blocked accounts update automatically.',
  },
  {
    path: '/dashboard',
    selector: '[data-tour="mode-toggle"]',
    title: 'Implementation vs Trial',
    description: 'This toggle switches the whole app between two modes: Implementation (live rollouts) and Trial (pre-implementation accounts). Everything in the sidebar changes with it.',
  },
  {
    path: '/trial',
    selector: '[data-tour="trial-dashboard"]',
    title: 'Free Trial',
    description: 'Accounts trialing before they become a real Implementation — track demo logins, the use case you\'re demoing, and notes here, separate from live clients.',
  },
  {
    path: '/dashboard',
    selector: '[data-tour="dashboard-clients"]',
    title: 'Clients & the 30-day plan',
    description: 'Open any client to see its 30-day rollout plan, team notes, and client SPOCs. Progress and status update as steps get marked done.',
  },
  {
    path: '/dashboard',
    selector: '[data-tour="dashboard-clients"]',
    title: 'Journey Report & Client Update',
    description: 'Inside any client, the Journey Report and Client Update buttons export a client-facing PDF summary — what\'s done, what\'s next, and growth opportunities.',
  },
]

const PLANNER_STEP: TourStep = {
  path: '/planner',
  selector: '[data-tour="planner-main"]',
  title: 'Planner',
  description: 'Your own cross-account task list — tasks from any client or trial account, plus anything you add directly, all in one private place.',
}

const NOTIF_STEP: TourStep = {
  path: '/dashboard',
  selector: '[data-tour="notif-bell"]',
  title: 'Notifications',
  description: 'Mentions and upcoming deadlines land here — from both Implementation and Trial, color-coded so you can tell them apart.',
}

const LIBRARY_STEP: TourStep = {
  path: '/library',
  selector: '[data-tour="library-list"]',
  title: 'Use Case Library',
  description: 'The master list of use cases per industry, each with real example accounts — admin-managed, and what the Growth tab on a client draws from.',
}

const SETTINGS_STEP: TourStep = {
  path: '/settings',
  selector: '[data-tour="settings-main"]',
  title: 'Settings',
  description: 'Manage the team and roles, dropdown options (Sales SPOC, Country, Modules…), and the default 30-day plan template used for every new client.',
}

export function getTourSteps(role: Role): TourStep[] {
  const steps = [...CORE_STEPS, PLANNER_STEP, NOTIF_STEP]
  if (role === 'admin') steps.push(LIBRARY_STEP, SETTINGS_STEP)
  return steps
}
