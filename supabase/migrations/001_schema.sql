-- ============================================================
-- Implementation Tracker Schema
-- ============================================================

-- Profiles: linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin', 'member', 'visitor')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on first Google login
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Clients
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  industry            TEXT,
  company_size        TEXT,
  owner_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'on_track'
                        CHECK (status IN ('on_track', 'at_risk', 'blocked_on_client', 'handed_over')),
  kickoff_date        DATE,
  handover_date       DATE,
  handed_over_to_kam  TEXT,
  is_handed_over      BOOLEAN DEFAULT FALSE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID REFERENCES profiles(id)
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read clients"
  ON clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Members and admins can insert clients"
  ON clients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Members and admins can update clients"
  ON clients FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- Plan Steps (auto-populated from 30-day template)
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_steps (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  step_name             TEXT NOT NULL,
  ideated_day_range     TEXT NOT NULL,
  step_order            INTEGER NOT NULL,
  description           TEXT,
  status                TEXT NOT NULL DEFAULT 'not_started'
                          CHECK (status IN ('not_started', 'in_progress', 'done')),
  real_date_completed   DATE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE plan_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage plan_steps"
  ON plan_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Deviation Log
-- ============================================================
CREATE TABLE IF NOT EXISTS deviation_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deviation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage deviation_log"
  ON deviation_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Rollout Confirmations
-- ============================================================
CREATE TABLE IF NOT EXISTS rollout_confirmations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  confirmed_date  DATE NOT NULL,
  set_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rollout_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage rollout_confirmations"
  ON rollout_confirmations FOR ALL TO authenticated USING (true) WITH CHECK (true);
