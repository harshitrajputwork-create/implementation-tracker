-- Admins can permanently delete a client (cascades to plan_steps, deviation_log,
-- rollout_confirmations, client_spocs, personal_notes, client_use_cases, activity_log)
CREATE POLICY "Admins can delete clients"
  ON clients FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- KAM dropdown options (used on handover)
INSERT INTO config_options (config_key, label, sort_order) VALUES
  ('kam', 'Siddharth', 1),
  ('kam', 'Nikhil',    2),
  ('kam', 'Akshatha',  3),
  ('kam', 'Ajesh',     4),
  ('kam', 'Ashish',    5);
