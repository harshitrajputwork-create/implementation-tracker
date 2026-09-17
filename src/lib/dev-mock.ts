import type { Profile, Client, PlanStep, DeviationLogEntry, RolloutConfirmation } from './types'
import { PLAN_TEMPLATE } from './plan-template'

export const IS_DEV_BYPASS =
  process.env.DEV_BYPASS === 'true' && process.env.NODE_ENV !== 'production'

export const MOCK_PROFILE: Profile = {
  id: 'dev-user-1',
  email: 'harshit@taqtics.co',
  full_name: 'Harshit Rajput',
  avatar_url: null,
  role: 'admin',
  created_at: '2026-09-01T09:00:00Z',
}

export const MOCK_MEMBERS: Profile[] = [
  MOCK_PROFILE,
  {
    id: 'dev-user-2',
    email: 'priya@taqtics.co',
    full_name: 'Priya Sharma',
    avatar_url: null,
    role: 'member',
    created_at: '2026-09-05T09:00:00Z',
  },
  {
    id: 'dev-user-3',
    email: 'rahul@taqtics.co',
    full_name: 'Rahul Mehta',
    avatar_url: null,
    role: 'member',
    created_at: '2026-09-05T09:00:00Z',
  },
]

const baseSteps = (clientId: string, doneTill: number): PlanStep[] =>
  PLAN_TEMPLATE.map((t, i) => ({
    id: `step-${clientId}-${t.step_order}`,
    client_id: clientId,
    step_name: t.step_name,
    ideated_day_range: t.ideated_day_range,
    step_order: t.step_order,
    description: t.description,
    status: i < doneTill ? 'done' : i === doneTill ? 'in_progress' : 'not_started',
    real_date_completed:
      i < doneTill
        ? new Date(Date.now() - (doneTill - i) * 2 * 86400000).toISOString().split('T')[0]
        : null,
    notes: null,
    notes_client_visible: false,
    created_at: '2026-09-01T09:00:00Z',
  }))

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'demo-client-1',
    status_override: null,
    last_activity_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    name: 'Lenskart',
    industry: 'Retail',
    company_size: '18 stores',
    owner_id: 'dev-user-2',
    status: 'on_track',
    kickoff_date: '2026-08-20',
    handover_date: null,
    handed_over_to_kam: null,
    is_handed_over: false,
    notes: 'Priority account. 3 modules in scope — checklists, issues, announcements.',
    ticket_size: 'Large',
    sales_spoc: 'Rohan Sharma',
    country: 'India',
    modules: ['Checklists', 'Issues', 'Announcements'],
    account_url: 'https://lenskart.taqtics.co/',
    weekly_offs: null,
    tz_offset: null,
    created_at: '2026-08-20T09:00:00Z',
    created_by: 'dev-user-1',
    owner: MOCK_MEMBERS[1],
    plan_steps: baseSteps('demo-client-1', 5),
  },
  {
    id: 'demo-client-2',
    status_override: null,
    last_activity_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    name: 'Wow Momo',
    industry: 'Food & Beverage (QSR)',
    company_size: '24 outlets',
    owner_id: 'dev-user-3',
    status: 'at_risk',
    kickoff_date: '2026-09-01',
    handover_date: null,
    handed_over_to_kam: null,
    is_handed_over: false,
    notes: null,
    ticket_size: 'Medium',
    sales_spoc: 'Priya Mehta',
    country: 'India',
    modules: ['Checklists'],
    account_url: null,
    weekly_offs: null,
    tz_offset: null,
    created_at: '2026-09-01T09:00:00Z',
    created_by: 'dev-user-1',
    owner: MOCK_MEMBERS[2],
    plan_steps: baseSteps('demo-client-2', 2),
  },
  {
    id: 'demo-client-3',
    status_override: 'handed_over' as const,
    last_activity_at: '2026-08-15T09:00:00Z',
    name: 'PVR Inox',
    industry: 'Retail',
    company_size: '11 multiplexes',
    owner_id: 'dev-user-2',
    status: 'handed_over',
    kickoff_date: '2026-07-15',
    handover_date: '2026-08-15',
    handed_over_to_kam: 'Deepak Nair',
    is_handed_over: true,
    notes: null,
    ticket_size: 'XL',
    sales_spoc: null,
    country: 'India',
    modules: null,
    account_url: 'https://pvrinox.taqtics.co/',
    weekly_offs: null,
    tz_offset: null,
    created_at: '2026-07-15T09:00:00Z',
    created_by: 'dev-user-1',
    owner: MOCK_MEMBERS[1],
    plan_steps: baseSteps('demo-client-3', 10),
  },
  {
    id: 'demo-client-4',
    status_override: null,
    last_activity_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    name: 'Haldiram\'s',
    industry: 'Food & Beverage (QSR)',
    company_size: '8 stores',
    owner_id: 'dev-user-1',
    status: 'blocked_on_client',
    kickoff_date: '2026-09-05',
    handover_date: null,
    handed_over_to_kam: null,
    is_handed_over: false,
    notes: null,
    ticket_size: 'Small',
    sales_spoc: 'Rohan Sharma',
    country: 'India',
    modules: ['Issues'],
    account_url: null,
    weekly_offs: null,
    tz_offset: null,
    created_at: '2026-09-05T09:00:00Z',
    created_by: 'dev-user-1',
    owner: MOCK_PROFILE,
    plan_steps: baseSteps('demo-client-4', 1),
  },
]

export function getMockClient(id: string): Client | null {
  return MOCK_CLIENTS.find((c) => c.id === id) ?? null
}

export function getMockSteps(clientId: string): PlanStep[] {
  return baseSteps(clientId, 5)
}

export const MOCK_DEVIATION_LOG: DeviationLogEntry[] = [
  {
    id: 'dev-log-1',
    client_id: 'demo-client-1',
    author_id: 'dev-user-2',
    note: 'Client SPOC (Ananya Singh) was on leave during D11. Configuration sign-off pushed by 2 days. Confirmed over email she will review by Sep 5.',
    cause: 'client_caused',
    client_visible: false,
    created_at: '2026-09-03T14:30:00Z',
    author: MOCK_MEMBERS[1],
  },
  {
    id: 'dev-log-2',
    client_id: 'demo-client-1',
    author_id: 'dev-user-2',
    note: 'Store data received late (D7, not D5). Checklist content was mostly standard so configuration not significantly delayed. Sales (Vikram) notified for future accounts.',
    cause: 'client_caused',
    client_visible: false,
    created_at: '2026-08-27T11:00:00Z',
    author: MOCK_MEMBERS[1],
  },
]

export const MOCK_ROLLOUT: RolloutConfirmation = {
  id: 'dev-rollout-1',
  client_id: 'demo-client-1',
  confirmed_date: '2026-09-18',
  set_by: 'dev-user-2',
  notes: 'Confirmed via email thread with Ananya Singh on 10 Sep.',
  created_at: '2026-09-10T10:00:00Z',
  set_by_profile: MOCK_MEMBERS[1],
}
