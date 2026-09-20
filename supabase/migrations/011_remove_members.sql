-- Let admins remove a member. Deleting a profile previously failed for anyone
-- who had created a client, because clients.created_by had no ON DELETE rule.
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_created_by_fkey;
ALTER TABLE clients
  ADD CONSTRAINT clients_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    AND id <> auth.uid()
  );
