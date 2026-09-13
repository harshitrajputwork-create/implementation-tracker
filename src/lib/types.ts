export type Role = 'admin' | 'member' | 'visitor'
export type ClientStatus = 'on_track' | 'at_risk' | 'blocked_on_client' | 'handed_over'
export type StepStatus = 'not_started' | 'in_progress' | 'done'
export type DeviationCause = 'client_caused' | 'internal' | 'other'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: Role
  created_at: string
}

export interface Invitation {
  id: string
  email: string
  role: Role
  invited_by: string | null
  accepted: boolean
  created_at: string
}

export interface Client {
  id: string
  name: string
  industry: string | null
  company_size: string | null
  owner_id: string | null
  status: ClientStatus
  status_override: ClientStatus | null
  kickoff_date: string | null
  handover_date: string | null
  handed_over_to_kam: string | null
  is_handed_over: boolean
  notes: string | null
  last_activity_at: string | null
  created_at: string
  created_by: string | null
  ticket_size: string | null
  sales_spoc: string | null
  country: string | null
  modules: string[] | null
  account_url: string | null
  owner?: Profile | null
  plan_steps?: PlanStep[]
}

export interface ConfigOption {
  id: string
  config_key: string
  label: string
  sort_order: number
  created_at: string
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
  notes_client_visible: boolean
  created_at: string
}

export interface DeviationLogEntry {
  id: string
  client_id: string
  author_id: string | null
  note: string
  cause: DeviationCause | null
  client_visible: boolean
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

export interface UseCase {
  id: string
  title: string
  description: string | null
  industry_tag: string | null
  link: string | null
  created_by: string | null
  created_at: string
}

export interface ClientUseCase {
  id: string
  client_id: string
  use_case_id: string
  is_using: boolean
  updated_at: string
  use_case?: UseCase
}

export interface ClientSpoc {
  id: string
  client_id: string
  name: string
  email: string | null
  department: string | null
  notes: string | null
  sort_order: number
  created_at: string
}

export interface PersonalNote {
  id: string
  client_id: string
  user_id: string
  content: string
  updated_at: string
}

export interface ActivityEntry {
  id: string
  client_id: string
  user_id: string | null
  user_name: string | null
  action: string
  detail: string | null
  created_at: string
}
