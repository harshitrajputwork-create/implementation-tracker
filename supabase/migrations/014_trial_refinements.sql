-- Trial account fields requested after first use: company size, modules
-- shown, a place to note the use case being demoed. Timezone dropped (not
-- needed — trials don't need scheduling precision).
ALTER TABLE trial_accounts DROP COLUMN IF EXISTS tz_offset;
ALTER TABLE trial_accounts ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE trial_accounts ADD COLUMN IF NOT EXISTS modules TEXT[] DEFAULT '{}';
ALTER TABLE trial_accounts ADD COLUMN IF NOT EXISTS use_case_notes TEXT;

-- Fix: mention notifications on trial notes were being inserted with
-- notifications.client_id set to a trial_accounts.id, which violates that
-- column's FK to clients(id) — those inserts were silently failing. Give
-- trial mentions their own column instead of overloading client_id.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS trial_account_id UUID REFERENCES trial_accounts(id) ON DELETE CASCADE;
