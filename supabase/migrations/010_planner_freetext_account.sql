-- Planner "account" should accept any name, not just tracked clients — people
-- often ask about accounts that aren't (yet, or ever) in the implementation
-- tracker. client_id stays for a real link when it does match a tracked
-- client; account_name carries the free-text label either way.
ALTER TABLE planner_tasks ADD COLUMN IF NOT EXISTS account_name TEXT;
