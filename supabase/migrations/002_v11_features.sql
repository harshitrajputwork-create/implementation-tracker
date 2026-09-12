-- ============================================================
-- v1.1 Feature Additions
-- ============================================================

-- Feature 4: Deviation cause tag
ALTER TABLE deviation_log
  ADD COLUMN IF NOT EXISTS cause TEXT
    CHECK (cause IN ('client_caused', 'internal', 'other')),
  ADD COLUMN IF NOT EXISTS client_visible BOOLEAN DEFAULT FALSE NOT NULL;

-- Feature 2: Client-safe export — step notes visibility flag
ALTER TABLE plan_steps
  ADD COLUMN IF NOT EXISTS notes_client_visible BOOLEAN DEFAULT FALSE NOT NULL;

-- Feature 3: Auto at-risk — manual status override
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS status_override TEXT
    CHECK (status_override IN ('on_track', 'at_risk', 'blocked_on_client', 'handed_over'));

-- Feature 5: Dashboard last-activity tracking
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Feature 1: Invitations (allow-list by email + role)
CREATE TABLE IF NOT EXISTS invitations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'member'
               CHECK (role IN ('admin', 'member', 'visitor')),
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  accepted   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (email)
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read invitations"
  ON invitations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage invitations"
  ON invitations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-accept invitation on first login (sets profile role from invitation)
CREATE OR REPLACE FUNCTION public.accept_invitation_on_login()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv_role TEXT;
BEGIN
  SELECT role INTO inv_role FROM public.invitations
  WHERE email = NEW.email AND accepted = FALSE;

  IF inv_role IS NOT NULL THEN
    UPDATE public.profiles SET role = inv_role WHERE id = NEW.id;
    UPDATE public.invitations SET accepted = TRUE WHERE email = NEW.email;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.accept_invitation_on_login();

-- Feature 6: Use Case Library
CREATE TABLE IF NOT EXISTS use_cases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  industry_tag TEXT,
  link         TEXT,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE use_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read use_cases"
  ON use_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage use_cases"
  ON use_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Feature 6: Per-client use case toggle
CREATE TABLE IF NOT EXISTS client_use_cases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  use_case_id  UUID REFERENCES use_cases(id) ON DELETE CASCADE NOT NULL,
  is_using     BOOLEAN DEFAULT FALSE NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, use_case_id)
);

ALTER TABLE client_use_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage client_use_cases"
  ON client_use_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);
