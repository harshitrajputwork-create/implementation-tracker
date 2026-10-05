-- The demo-credentials table on a trial account is now just ID + one-time
-- temp password by default, plus whatever custom columns the implementer
-- adds (e.g. "Store", "Role") — this column holds the ordered list of those
-- extra column headers, shared across all rows. Row values for them live in
-- trial_accounts.demo_credentials[].extra (JSONB, no schema change needed).
ALTER TABLE trial_accounts ADD COLUMN IF NOT EXISTS demo_credential_columns TEXT[] DEFAULT '{}';
