-- Optional "who I spoke with" tag per note (requested for Free Trial notes,
-- works for client notes too since both share client_notes).
ALTER TABLE client_notes ADD COLUMN IF NOT EXISTS spoke_with TEXT;

-- Demo login credentials (dummy accounts + one-time temp passwords) an
-- implementer hands to the client during a trial — previously pasted ad hoc
-- into the "use case" notes; now a structured list exportable as CSV.
ALTER TABLE trial_accounts ADD COLUMN IF NOT EXISTS demo_credentials JSONB DEFAULT '[]'::jsonb;

-- Trial start date is no longer forced at creation — make the column
-- explicitly nullable (it already allowed NULL, this is just documentation
-- of intent: new trial accounts can be created without one).
COMMENT ON COLUMN trial_accounts.trial_start_date IS 'Optional — not set automatically on creation.';
