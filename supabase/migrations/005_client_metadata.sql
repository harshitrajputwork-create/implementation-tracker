-- New fields on clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ticket_size  TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sales_spoc   TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country      TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS modules      TEXT[] DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS account_url  TEXT;

-- Configurable dropdown values table
CREATE TABLE IF NOT EXISTS config_options (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL,   -- 'sales_spoc' | 'country' | 'module'
  label      TEXT NOT NULL,
  sort_order INT  DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE config_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read config_options"
  ON config_options FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can modify config_options"
  ON config_options FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO config_options (config_key, label, sort_order) VALUES
  ('sales_spoc', 'Pavan',      1),
  ('sales_spoc', 'Yudi',       2),
  ('sales_spoc', 'Ritik',      3),
  ('sales_spoc', 'Riti',       4),
  ('sales_spoc', 'Sharon',     5),
  ('sales_spoc', 'Shivangee',  6),
  ('country', 'India',        1),
  ('country', 'UAE',          2),
  ('country', 'US',           3),
  ('country', 'UK',           4),
  ('country', 'Africa',       5),
  ('country', 'Philippines',  6),
  ('country', 'Indonesia',    7),
  ('country', 'Kuwait',       8),
  ('country', 'Egypt',        9),
  ('country', 'Paris',        10),
  ('country', 'Saudi',        11),
  ('country', 'Middle East',  12),
  ('country', 'Thailand',     13),
  ('country', 'China',        14),
  ('country', 'Australia',    15),
  ('country', 'Canada',       16),
  ('country', 'Global',       17),
  ('country', 'Malaysia',     18),
  ('module', 'Checklist&Task',    1),
  ('module', 'Audit',             2),
  ('module', 'Issue Ticketing',   3),
  ('module', 'Asset Management',  4),
  ('module', 'E-Learning',        5),
  ('module', 'VM',                6),
  ('module', 'Attendance',        7);
