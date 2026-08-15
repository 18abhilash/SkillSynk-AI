ALTER TABLE hiring_campaigns
  ADD COLUMN IF NOT EXISTS skill_names text[] DEFAULT '{}';