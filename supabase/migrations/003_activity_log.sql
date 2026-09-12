-- ============================================================
-- v1.2: Activity Log per client
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name  TEXT,
  action     TEXT NOT NULL,
  detail     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read activity_log"
  ON activity_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert activity_log"
  ON activity_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_activity_log_client
  ON activity_log (client_id, created_at DESC);
