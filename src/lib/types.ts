export type Role = 'admin' | 'member' | 'visitor'
export type ClientStatus = 'on_track' | 'at_risk' | 'blocked_on_client' | 'handed_over'
export type StepStatus = 'not_started' | 'in_progress' | 'done'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: Role
  created_at: string
}

export interface Client {
  id: string
  name: string
  industry: string | null
  company_size: string | null
  owner_id: string | null
  status: ClientStatus
  kickoff_date: string | null
  handover_date: string | null
  handed_over_to_kam: string | null
  is_handed_over: boolean
  notes: string | null
  created_at: string
  created_by: string | null
  owner?: Profile | null
  plan_steps?: PlanStep[]
}

export interface PlanStep {
  id: string
  client_id: string
  step_name: string
  ideated_day_range: string
  step_order: number
  description: string | null
  status: StepStatus
  real_date_completed: string | null
  notes: string | null
  created_at: string
}

export interface DeviationLogEntry {
  id: string
  client_id: string
  author_id: string | null
  note: string
  created_at: string
  author?: Profile | null
}

export interface RolloutConfirmation {
  id: string
  client_id: string
  confirmed_date: string
  set_by: string | null
  notes: string | null
  created_at: string
  set_by_profile?: Profile | null
}
