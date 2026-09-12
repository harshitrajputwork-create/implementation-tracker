CREATE TABLE IF NOT EXISTS step_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_order        INT NOT NULL,
  step_name         TEXT NOT NULL,
  ideated_day_range TEXT NOT NULL,
  description       TEXT,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE step_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read step_templates"
  ON step_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can modify step_templates"
  ON step_templates FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

INSERT INTO step_templates (step_order, step_name, ideated_day_range, description) VALUES
  (1,  'Kickoff',                        'D1',      'Present ideated 30-day flow to client; agree scope for this cycle (modules, store count) and confirm over email.'),
  (2,  'Client data collection',         'D2-D5',   'Client shares workflows, users, store details and checklists. Sales nudges client. If not received by D5, proceed with standard template checklist.'),
  (3,  'Platform configuration',         'D6-D10',  'Configure platform with a feedback loop to the client as work progresses.'),
  (4,  'Configuration sign-off',         'D11',     'Show configured platform to client SPOC and get written confirmation.'),
  (5,  'Admin & store user training',    'D12-D15', 'Training for admins and store users; guide materials shared.'),
  (6,  'Go-Live & rollout date confirmed','D16-D23', 'Agree rollout date with client over email. This confirmed date is the go-live anchor for the billing cycle — not raw store activity.'),
  (7,  'Open office hour',               'D24',     'One open meeting anyone from the client side can join to ask questions about what''s configured.'),
  (8,  'Growth plan shared',             'D25',     'Share what similar clients in the same sector are doing, and how this client can get more value — including upsell of modules/stores not yet in scope.'),
  (9,  'Health check & open items closed','D26-D29', 'Health check shared with SPOC; remaining configuration feedback closed out in parallel.'),
  (10, 'KAM handover',                   'D30',     'Handover to KAM with journey report. Full store adoption is KAM''s ongoing responsibility, not implementation''s.');
