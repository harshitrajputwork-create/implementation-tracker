-- Client-side SPOCs (points of contact)
CREATE TABLE IF NOT EXISTS client_spocs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  department  TEXT,
  notes       TEXT,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE client_spocs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read client_spocs"
  ON client_spocs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Members and admins can write client_spocs"
  ON client_spocs FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','member')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','member')));

-- Personal notes — only the author can ever read or write their own rows
CREATE TABLE IF NOT EXISTS personal_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, user_id)
);

ALTER TABLE personal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only manage their own personal notes"
  ON personal_notes FOR ALL TO authenticated
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
