-- ============================================================
-- Notifications (mentions today; extensible to other alert types)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name   TEXT,
  type         TEXT NOT NULL DEFAULT 'mention',
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_name  TEXT,
  context      TEXT,
  preview      TEXT,
  link_path    TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users update their own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Anyone authenticated can create a notification addressed to someone else
-- (this is how @mentions alert people) — reads/updates stay locked to the recipient.
CREATE POLICY "Authenticated can insert notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);

-- ============================================================
-- Structured client notes (mentions + optional deadline, team or personal)
-- ============================================================
CREATE TABLE IF NOT EXISTS client_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name   TEXT,
  content       TEXT NOT NULL,
  is_personal   BOOLEAN NOT NULL DEFAULT FALSE,
  deadline      DATE,
  deadline_done BOOLEAN NOT NULL DEFAULT FALSE,
  mentioned_ids UUID[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read team notes or own personal notes"
  ON client_notes FOR SELECT TO authenticated
  USING (is_personal = FALSE OR author_id = auth.uid());

CREATE POLICY "Insert own notes"
  ON client_notes FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Update own notes"
  ON client_notes FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Delete own notes"
  ON client_notes FOR DELETE TO authenticated
  USING (author_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_client_notes_client ON client_notes(client_id, created_at DESC);

-- ============================================================
-- Personal planner — fully private per-user task list
-- ============================================================
CREATE TABLE IF NOT EXISTS planner_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team        TEXT,
  person      TEXT,
  client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
  task        TEXT NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  deadline    DATE,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE planner_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage only their own planner tasks"
  ON planner_tasks FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_planner_tasks_user ON planner_tasks(user_id, status, deadline);

-- ============================================================
-- Client scheduling info — weekly offs + timezone offset from IST
-- ============================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS weekly_offs TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tz_offset    TEXT;
