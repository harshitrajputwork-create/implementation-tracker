-- ============================================================
-- Free Trial accounts — lightweight pre-implementation tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS trial_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  trial_url         TEXT,
  sales_spoc        TEXT,
  country           TEXT,
  tz_offset         TEXT,
  status            TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Stalled', 'Converted', 'Lost')),
  trial_start_date  DATE,
  trial_end_date    DATE,
  owner_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trial_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read trial_accounts"
  ON trial_accounts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Members and admins can insert trial_accounts"
  ON trial_accounts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Members and admins can update trial_accounts"
  ON trial_accounts FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete trial_accounts"
  ON trial_accounts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_trial_accounts_status ON trial_accounts(status);

-- ============================================================
-- Generalize client_notes to also carry notes on a trial account.
-- Exactly one of client_id / trial_account_id must be set.
-- ============================================================
ALTER TABLE client_notes ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE client_notes ADD COLUMN IF NOT EXISTS trial_account_id UUID REFERENCES trial_accounts(id) ON DELETE CASCADE;
ALTER TABLE client_notes DROP CONSTRAINT IF EXISTS client_notes_one_entity_check;
ALTER TABLE client_notes ADD CONSTRAINT client_notes_one_entity_check
  CHECK ((client_id IS NOT NULL AND trial_account_id IS NULL) OR (client_id IS NULL AND trial_account_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_client_notes_trial ON client_notes(trial_account_id, created_at DESC);

-- ============================================================
-- Planner tasks can also point at a trial account.
-- ============================================================
ALTER TABLE planner_tasks ADD COLUMN IF NOT EXISTS trial_account_id UUID REFERENCES trial_accounts(id) ON DELETE SET NULL;

-- ============================================================
-- Billing type on clients (User-wise / Store-wise)
-- ============================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_type TEXT CHECK (billing_type IN ('User-wise', 'Store-wise'));
