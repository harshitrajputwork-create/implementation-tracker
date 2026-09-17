-- Speeds up the notification bell's "upcoming deadlines" query
-- (author_id + open deadline lookups), which now runs client-side on a poll
-- instead of blocking every page render.
CREATE INDEX IF NOT EXISTS idx_client_notes_author_deadline
  ON client_notes(author_id, deadline)
  WHERE deadline IS NOT NULL AND deadline_done = FALSE;
