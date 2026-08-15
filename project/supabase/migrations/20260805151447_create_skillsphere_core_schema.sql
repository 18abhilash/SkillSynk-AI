/*
# SkillSphere AI — Core Schema (Tables + Simple Policies)

Creates all tables and their self-referential RLS policies.
Cross-table policies (company_members-dependent) are added in a follow-up migration.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  headline text,
  bio text,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('guest','student','professional','recruiter','company_admin','university','trainer','platform_admin')),
  is_public boolean NOT NULL DEFAULT true,
  learning_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_activity_date date,
  total_xp int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- SKILLS
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  category text NOT NULL,
  description text,
  icon_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "skills_read_all" ON skills;
CREATE POLICY "skills_read_all" ON skills FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "skills_insert_auth" ON skills;
CREATE POLICY "skills_insert_auth" ON skills FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "skills_update_auth" ON skills;
CREATE POLICY "skills_update_auth" ON skills FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- CONCEPTS
CREATE TABLE IF NOT EXISTS concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  difficulty int NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  bloom_level text NOT NULL DEFAULT 'understand' CHECK (bloom_level IN ('remember','understand','apply','analyze','evaluate','create')),
  prerequisite_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "concepts_read_all" ON concepts;
CREATE POLICY "concepts_read_all" ON concepts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "concepts_insert_auth" ON concepts;
CREATE POLICY "concepts_insert_auth" ON concepts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "concepts_update_auth" ON concepts;
CREATE POLICY "concepts_update_auth" ON concepts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- SKILL ASSESSMENTS
CREATE TABLE IF NOT EXISTS skill_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  confidence numeric NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  verified boolean NOT NULL DEFAULT false,
  industry_readiness text NOT NULL DEFAULT 'beginner' CHECK (industry_readiness IN ('beginner','intermediate','advanced','expert')),
  strengths jsonb NOT NULL DEFAULT '[]',
  weaknesses jsonb NOT NULL DEFAULT '[]',
  recommended_roles jsonb NOT NULL DEFAULT '[]',
  salary_range jsonb,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, skill_id)
);
ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "skill_assessments_select_own" ON skill_assessments;
CREATE POLICY "skill_assessments_select_own" ON skill_assessments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "skill_assessments_insert_own" ON skill_assessments;
CREATE POLICY "skill_assessments_insert_own" ON skill_assessments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "skill_assessments_update_own" ON skill_assessments;
CREATE POLICY "skill_assessments_update_own" ON skill_assessments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "skill_assessments_delete_own" ON skill_assessments;
CREATE POLICY "skill_assessments_delete_own" ON skill_assessments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- CONCEPT MASTERY
CREATE TABLE IF NOT EXISTS concept_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  confidence numeric NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  mastery_level text NOT NULL DEFAULT 'not_started' CHECK (mastery_level IN ('not_started','learning','practiced','mastered')),
  evidence jsonb NOT NULL DEFAULT '{}',
  last_tested timestamptz,
  trend text NOT NULL DEFAULT 'stable' CHECK (trend IN ('improving','stable','declining')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, concept_id)
);
ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "concept_mastery_select_own" ON concept_mastery;
CREATE POLICY "concept_mastery_select_own" ON concept_mastery FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "concept_mastery_insert_own" ON concept_mastery;
CREATE POLICY "concept_mastery_insert_own" ON concept_mastery FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "concept_mastery_update_own" ON concept_mastery;
CREATE POLICY "concept_mastery_update_own" ON concept_mastery FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "concept_mastery_delete_own" ON concept_mastery;
CREATE POLICY "concept_mastery_delete_own" ON concept_mastery FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- DIAGNOSIS SESSIONS
CREATE TABLE IF NOT EXISTS diagnosis_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  root_cause text,
  confidence numeric NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  weak_concepts jsonb NOT NULL DEFAULT '[]',
  strong_concepts jsonb NOT NULL DEFAULT '[]',
  knowledge_score numeric NOT NULL DEFAULT 0,
  skill_score numeric NOT NULL DEFAULT 0,
  question_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE diagnosis_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "diagnosis_sessions_select_own" ON diagnosis_sessions;
CREATE POLICY "diagnosis_sessions_select_own" ON diagnosis_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "diagnosis_sessions_insert_own" ON diagnosis_sessions;
CREATE POLICY "diagnosis_sessions_insert_own" ON diagnosis_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "diagnosis_sessions_update_own" ON diagnosis_sessions;
CREATE POLICY "diagnosis_sessions_update_own" ON diagnosis_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "diagnosis_sessions_delete_own" ON diagnosis_sessions;
CREATE POLICY "diagnosis_sessions_delete_own" ON diagnosis_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- DIAGNOSIS MESSAGES
CREATE TABLE IF NOT EXISTS diagnosis_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES diagnosis_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('ai','user')),
  content text NOT NULL,
  concept_id uuid REFERENCES concepts(id) ON DELETE SET NULL,
  confidence_delta numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE diagnosis_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "diagnosis_messages_select_own" ON diagnosis_messages;
CREATE POLICY "diagnosis_messages_select_own" ON diagnosis_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM diagnosis_sessions WHERE diagnosis_sessions.id = diagnosis_messages.session_id AND diagnosis_sessions.user_id = auth.uid())
);
DROP POLICY IF EXISTS "diagnosis_messages_insert_own" ON diagnosis_messages;
CREATE POLICY "diagnosis_messages_insert_own" ON diagnosis_messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM diagnosis_sessions WHERE diagnosis_sessions.id = diagnosis_messages.session_id AND diagnosis_sessions.user_id = auth.uid())
);
DROP POLICY IF EXISTS "diagnosis_messages_delete_own" ON diagnosis_messages;
CREATE POLICY "diagnosis_messages_delete_own" ON diagnosis_messages FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM diagnosis_sessions WHERE diagnosis_sessions.id = diagnosis_messages.session_id AND diagnosis_sessions.user_id = auth.uid())
);

-- COMPANIES (no update policy yet — added in next migration after company_members exists)
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  website text,
  industry text,
  size text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "companies_read_all" ON companies;
CREATE POLICY "companies_read_all" ON companies FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "companies_insert_own" ON companies;
CREATE POLICY "companies_insert_own" ON companies FOR INSERT TO authenticated WITH CHECK (true);

-- COMPANY MEMBERS
CREATE TABLE IF NOT EXISTS company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'recruiter' CHECK (role IN ('recruiter','admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_members_select_own" ON company_members;
CREATE POLICY "company_members_select_own" ON company_members FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "company_members_insert_own" ON company_members;
CREATE POLICY "company_members_insert_own" ON company_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "company_members_delete_own" ON company_members;
CREATE POLICY "company_members_delete_own" ON company_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- HIRING CAMPAIGNS
CREATE TABLE IF NOT EXISTS hiring_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  job_description text,
  skill_ids uuid[] NOT NULL DEFAULT '{}',
  difficulty text NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner','intermediate','advanced','expert')),
  duration_minutes int NOT NULL DEFAULT 60,
  max_candidates int NOT NULL DEFAULT 100,
  ai_proctoring boolean NOT NULL DEFAULT true,
  webcam_required boolean NOT NULL DEFAULT false,
  screen_recording boolean NOT NULL DEFAULT false,
  tab_detection boolean NOT NULL DEFAULT true,
  face_detection boolean NOT NULL DEFAULT false,
  browser_lock boolean NOT NULL DEFAULT true,
  randomization boolean NOT NULL DEFAULT true,
  question_types text[] NOT NULL DEFAULT '{"mcq","coding"}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hiring_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hiring_campaigns_select_company" ON hiring_campaigns;
CREATE POLICY "hiring_campaigns_select_company" ON hiring_campaigns FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM company_members WHERE company_members.company_id = hiring_campaigns.company_id AND company_members.user_id = auth.uid())
);
DROP POLICY IF EXISTS "hiring_campaigns_insert_company" ON hiring_campaigns;
CREATE POLICY "hiring_campaigns_insert_company" ON hiring_campaigns FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM company_members WHERE company_members.company_id = hiring_campaigns.company_id AND company_members.user_id = auth.uid())
);
DROP POLICY IF EXISTS "hiring_campaigns_update_company" ON hiring_campaigns;
CREATE POLICY "hiring_campaigns_update_company" ON hiring_campaigns FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM company_members WHERE company_members.company_id = hiring_campaigns.company_id AND company_members.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM company_members WHERE company_members.company_id = hiring_campaigns.company_id AND company_members.user_id = auth.uid())
);
DROP POLICY IF EXISTS "hiring_campaigns_delete_company" ON hiring_campaigns;
CREATE POLICY "hiring_campaigns_delete_company" ON hiring_campaigns FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM company_members WHERE company_members.company_id = hiring_campaigns.company_id AND company_members.user_id = auth.uid())
);

-- CAMPAIGN CANDIDATES
CREATE TABLE IF NOT EXISTS campaign_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES hiring_campaigns(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_email text NOT NULL,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','in_progress','completed','rejected','expired')),
  score numeric,
  cheating_probability numeric,
  confidence numeric,
  strengths jsonb NOT NULL DEFAULT '[]',
  weaknesses jsonb NOT NULL DEFAULT '[]',
  hiring_recommendation text,
  skill_radar jsonb NOT NULL DEFAULT '{}',
  interview_suggestions jsonb NOT NULL DEFAULT '[]',
  invited_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (campaign_id, candidate_email)
);
ALTER TABLE campaign_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaign_candidates_select_company" ON campaign_candidates;
CREATE POLICY "campaign_candidates_select_company" ON campaign_candidates FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM hiring_campaigns hc
    JOIN company_members cm ON cm.company_id = hc.company_id
    WHERE hc.id = campaign_candidates.campaign_id AND cm.user_id = auth.uid()
  )
  OR campaign_candidates.candidate_id = auth.uid()
);
DROP POLICY IF EXISTS "campaign_candidates_insert_company" ON campaign_candidates;
CREATE POLICY "campaign_candidates_insert_company" ON campaign_candidates FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM hiring_campaigns hc
    JOIN company_members cm ON cm.company_id = hc.company_id
    WHERE hc.id = campaign_candidates.campaign_id AND cm.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "campaign_candidates_update_company" ON campaign_candidates;
CREATE POLICY "campaign_candidates_update_company" ON campaign_candidates FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM hiring_campaigns hc
    JOIN company_members cm ON cm.company_id = hc.company_id
    WHERE hc.id = campaign_candidates.campaign_id AND cm.user_id = auth.uid()
  )
  OR campaign_candidates.candidate_id = auth.uid()
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM hiring_campaigns hc
    JOIN company_members cm ON cm.company_id = hc.company_id
    WHERE hc.id = campaign_candidates.campaign_id AND cm.user_id = auth.uid()
  )
  OR campaign_candidates.candidate_id = auth.uid()
);

-- LEARNING PLANS
CREATE TABLE IF NOT EXISTS learning_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('diagnosis','skill_assessment','manual')),
  source_id uuid,
  root_cause text,
  estimated_days int NOT NULL DEFAULT 30,
  daily_plan jsonb NOT NULL DEFAULT '[]',
  weekly_plan jsonb NOT NULL DEFAULT '[]',
  projects jsonb NOT NULL DEFAULT '[]',
  videos jsonb NOT NULL DEFAULT '[]',
  books jsonb NOT NULL DEFAULT '[]',
  practice_problems jsonb NOT NULL DEFAULT '[]',
  progress numeric NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE learning_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "learning_plans_select_own" ON learning_plans;
CREATE POLICY "learning_plans_select_own" ON learning_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "learning_plans_insert_own" ON learning_plans;
CREATE POLICY "learning_plans_insert_own" ON learning_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "learning_plans_update_own" ON learning_plans;
CREATE POLICY "learning_plans_update_own" ON learning_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "learning_plans_delete_own" ON learning_plans;
CREATE POLICY "learning_plans_delete_own" ON learning_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_insert_own" ON audit_logs;
CREATE POLICY "audit_logs_insert_own" ON audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "audit_logs_select_own" ON audit_logs;
CREATE POLICY "audit_logs_select_own" ON audit_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_concepts_skill_id ON concepts(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_user_id ON skill_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_verified ON skill_assessments(verified) WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_concept_mastery_user_id ON concept_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_user_id ON diagnosis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_messages_session_id ON diagnosis_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_hiring_campaigns_company_id ON hiring_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_campaign_candidates_campaign_id ON campaign_candidates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_learning_plans_user_id ON learning_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread ON notifications(user_id) WHERE read = false;

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS diagnosis_sessions_updated_at ON diagnosis_sessions;
CREATE TRIGGER diagnosis_sessions_updated_at BEFORE UPDATE ON diagnosis_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS hiring_campaigns_updated_at ON hiring_campaigns;
CREATE TRIGGER hiring_campaigns_updated_at BEFORE UPDATE ON hiring_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS learning_plans_updated_at ON learning_plans;
CREATE TRIGGER learning_plans_updated_at BEFORE UPDATE ON learning_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS concept_mastery_updated_at ON concept_mastery;
CREATE TRIGGER concept_mastery_updated_at BEFORE UPDATE ON concept_mastery FOR EACH ROW EXECUTE FUNCTION update_updated_at();
