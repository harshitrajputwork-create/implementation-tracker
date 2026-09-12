export interface ChangelogEntry {
  date: string
  version: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-09-12',
    version: 'v1.1',
    changes: [
      'Team page — invite team members by email, assign roles (Admin/Member/Visitor)',
      'Deviation cause tag — mark each deviation as Client-caused, Internal, or Other',
      'Auto at-risk — steps past target date automatically flag the client as At Risk or Blocked',
      'Client Update export — clean, client-safe PDF with no internal notes or deviation deltas',
      'Dashboard: last-activity indicator, stale-client warning (3+ days), quick mark-done',
      'Use Case Library — admin-managed library; per-client Growth tab auto-filtered by industry',
      'What\'s New — this changelog in the sidebar',
    ],
  },
  {
    date: '2026-09-11',
    version: 'v1.0.2',
    changes: [
      'Gantt chart view as default on client page (toggle to Steps list)',
      'Actual calendar dates shown per step based on kickoff date',
      'Mark Done button + date picker as primary CTA — replaces icon-only cycling',
      'Auto deviation badge (e.g. +2d late / 1d early) on completed steps',
      'Journey report: added Target Dates and Deviation columns',
      'Fixed journey report crash (server-component event handler)',
      'Fixed step notes save button — now shows ✓ Saved confirmation',
    ],
  },
  {
    date: '2026-09-10',
    version: 'v1.0.1',
    changes: [
      'Fixed login redirect to production URL',
      'Dev Login bypass button for local development',
      'Fixed middleware crash on placeholder Supabase credentials',
    ],
  },
  {
    date: '2026-09-09',
    version: 'v1.0',
    changes: [
      'Dashboard with client list, status filters, and stat cards',
      'Client creation with 30-day plan auto-populated from template',
      'Step status tracking with deviation log',
      'Rollout date confirmation and KAM handover flow',
      'Journey Report export (print/PDF)',
      'Google OAuth sign-in, role-based access (Admin/Member/Visitor)',
    ],
  },
]
