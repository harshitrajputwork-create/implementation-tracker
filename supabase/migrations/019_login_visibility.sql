-- Expose each member's last sign-in time (Supabase Auth already tracks this
-- natively in auth.users.last_sign_in_at — no new logging table needed) to
-- exactly one person, checked inside the function itself (not just in app
-- code) so this can't be called by anyone else even via direct RPC.
CREATE OR REPLACE FUNCTION public.get_member_login_times()
RETURNS TABLE(id uuid, email text, last_sign_in_at timestamptz, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT au.id, au.email, au.last_sign_in_at, au.created_at
  FROM auth.users au
  WHERE (auth.jwt() ->> 'email') = 'harshit.rajput@taqtics.co'
  ORDER BY au.last_sign_in_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_login_times() TO authenticated;
