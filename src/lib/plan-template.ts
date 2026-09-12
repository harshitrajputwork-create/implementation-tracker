export interface TemplateStep {
  step_order: number
  step_name: string
  ideated_day_range: string
  description: string
}

export const PLAN_TEMPLATE: TemplateStep[] = [
  {
    step_order: 1,
    step_name: 'Kickoff',
    ideated_day_range: 'D1',
    description:
      'Present ideated 30-day flow to client; agree scope for this cycle (modules, store count) and confirm over email.',
  },
  {
    step_order: 2,
    step_name: 'Client data collection',
    ideated_day_range: 'D2–D5',
    description:
      'Client shares workflows, users, store details and checklists. Sales nudges client. If not received by D5, proceed with standard template checklist.',
  },
  {
    step_order: 3,
    step_name: 'Platform configuration',
    ideated_day_range: 'D6–D10',
    description:
      'Configure platform with a feedback loop to the client as work progresses.',
  },
  {
    step_order: 4,
    step_name: 'Configuration sign-off',
    ideated_day_range: 'D11',
    description:
      'Show configured platform to client SPOC and get written confirmation.',
  },
  {
    step_order: 5,
    step_name: 'Admin & store user training',
    ideated_day_range: 'D12–D15',
    description:
      'Training for admins and store users; guide materials shared.',
  },
  {
    step_order: 6,
    step_name: 'Go-Live & rollout date confirmed',
    ideated_day_range: 'D16–D23',
    description:
      'Agree rollout date with client over email. This confirmed date is the go-live anchor for the billing cycle — not raw store activity.',
  },
  {
    step_order: 7,
    step_name: 'Open office hour',
    ideated_day_range: 'D24',
    description:
      'One open meeting anyone from the client side can join to ask questions about what\'s configured.',
  },
  {
    step_order: 8,
    step_name: 'Growth plan shared',
    ideated_day_range: 'D25',
    description:
      'Share what similar clients in the same sector are doing, and how this client can get more value — including upsell of modules/stores not yet in scope.',
  },
  {
    step_order: 9,
    step_name: 'Health check & open items closed',
    ideated_day_range: 'D26–D29',
    description:
      'Health check shared with SPOC; remaining configuration feedback closed out in parallel.',
  },
  {
    step_order: 10,
    step_name: 'KAM handover',
    ideated_day_range: 'D30',
    description:
      'Handover to KAM with journey report. Full store adoption is KAM\'s ongoing responsibility, not implementation\'s.',
  },
]
