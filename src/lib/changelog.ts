export interface ChangelogEntry {
  date: string
  version: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-09-18',
    version: 'v1.6',
    changes: [
      '@mention tagging in Notes and Deviation Log — mentioned teammates get a notification',
      'Notification bell in sidebar — mentions + upcoming deadline reminders, click to jump straight to it',
      'Notes now support optional deadlines — log a reminder for yourself or the team, mark it done from the note or the Planner',
      'New: Planner — a private personal task list (team, person, account, priority, deadline) with sort-by-deadline / sort-by-priority, plus a live feed of every deadline you\'ve set on client notes',
      'Team and Configuration merged into one Settings page',
      'Sidebar: What\'s New collapsed into a small icon by your name; Planner and Notifications pinned at the top of the bottom panel',
      'Admin: delete a client permanently (type-to-confirm) from Edit details',
      'KAM is now a managed dropdown (Config) and its accounts are visible on a new dashboard tab, grouped by KAM',
      'Status badges show how overdue a client is (e.g. "4mo 12d overdue"), not just "Blocked"',
      'New client fields: Timezone vs IST and Weekly offs, shown on the client header for scheduling',
    ],
  },
  {
    date: '2026-09-13',
    version: 'v1.5',
    changes: [
      'New client fields: Ticket Size (Small/Medium/Large/XL), Sales SPOC, Country, Modules',
      'Dashboard: new Country, Ticket Size, SPOC columns; clickable rows; multi-select filters',
      'Client detail: edit all metadata via single "Edit details" button (modal)',
      'Admin config: manage Sales SPOC, Country, and Module dropdown values',
      'Sidebar: scrollable client list for direct navigation to any client',
      'Admin-only section in sidebar (Team, Use Cases, Configuration) pinned at bottom',
      'Global step template config at /config — defaults applied to every new client',
    ],
  },
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
