-- Access control tightening:
-- 1. Only @taqtics.co Google accounts can sign up at all — enforced at the
--    database level (BEFORE INSERT on auth.users) so it can't be bypassed
--    by calling the client SDK directly. Existing non-taqtics.co profiles
--    (if any) are NOT removed by this migration — review Team settings and
--    remove them manually if needed.
-- 2. A brand-new sign-in with no standing invitation now defaults to
--    'visitor' instead of 'member'. An admin invitation (see invitations
--    table + Settings > Team > "Invite someone") still overrides this —
--    e.g. pre-register a founder's email with role 'admin' before they
--    ever log in, and accept_invitation_on_login() (migration 002) applies
--    it automatically on their first sign-in.

ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'visitor';
ALTER TABLE invitations ALTER COLUMN role SET DEFAULT 'visitor';

CREATE OR REPLACE FUNCTION public.enforce_taqtics_domain()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS NULL OR NEW.email NOT ILIKE '%@taqtics.co' THEN
    RAISE EXCEPTION 'Access is restricted to Taqtics team members (@taqtics.co)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_domain_check ON auth.users;
CREATE TRIGGER on_auth_user_domain_check
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_taqtics_domain();
