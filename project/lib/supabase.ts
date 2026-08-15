import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  role: string;
  is_public: boolean;
  learning_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_xp: number;
  created_at: string;
  updated_at: string;
};

export type Skill = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  icon_name: string | null;
  created_at: string;
};

export type Concept = {
  id: string;
  skill_id: string;
  name: string;
  description: string | null;
  difficulty: number;
  bloom_level: string;
  prerequisite_ids: string[];
  created_at: string;
};

export type ConceptMastery = {
  id: string;
  user_id: string;
  concept_id: string;
  confidence: number;
  mastery_level: string;
  evidence: Record<string, unknown>;
  last_tested: string | null;
  trend: string;
  created_at: string;
  updated_at: string;
};

export type DiagnosisSession = {
  id: string;
  user_id: string;
  topic: string;
  root_cause: string | null;
  confidence: number;
  status: string;
  weak_concepts: string[];
  strong_concepts: string[];
  knowledge_score: number;
  skill_score: number;
  question_count: number;
  created_at: string;
  updated_at: string;
};

export type DiagnosisMessage = {
  id: string;
  session_id: string;
  role: 'ai' | 'user';
  content: string;
  concept_id: string | null;
  confidence_delta: number;
  created_at: string;
};

export type SkillAssessment = {
  id: string;
  user_id: string;
  skill_id: string;
  score: number;
  confidence: number;
  verified: boolean;
  industry_readiness: string;
  strengths: string[];
  weaknesses: string[];
  recommended_roles: string[];
  salary_range: { min: number; max: number; currency: string } | null;
  status: string;
  created_at: string;
  completed_at: string | null;
};

export type Company = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  size: string | null;
  created_at: string;
};

export type HiringCampaign = {
  id: string;
  company_id: string;
  created_by: string;
  title: string;
  job_description: string | null;
  skill_ids: string[];
  skill_names?: string[];
  difficulty: string;
  duration_minutes: number;
  max_candidates: number;
  ai_proctoring: boolean;
  webcam_required: boolean;
  screen_recording: boolean;
  tab_detection: boolean;
  face_detection: boolean;
  browser_lock: boolean;
  randomization: boolean;
  question_types: string[];
  status: string;
  created_at: string;
  updated_at: string;
};

export type CampaignCandidate = {
  id: string;
  campaign_id: string;
  candidate_id: string | null;
  candidate_email: string;
  status: string;
  score: number | null;
  cheating_probability: number | null;
  confidence: number | null;
  strengths: string[];
  weaknesses: string[];
  hiring_recommendation: string | null;
  skill_radar: Record<string, number>;
  interview_suggestions: string[];
  invited_at: string;
  completed_at: string | null;
};

export type LearningPlan = {
  id: string;
  user_id: string;
  title: string;
  source_type: string;
  source_id: string | null;
  root_cause: string | null;
  estimated_days: number;
  daily_plan: Array<{ day: number; title: string; tasks: string[] }>;
  weekly_plan: Array<{ week: number; title: string; goals: string[] }>;
  projects: Array<{ title: string; description: string; difficulty: string }>;
  videos: Array<{ title: string; url: string; duration: string }>;
  books: Array<{ title: string; author: string }>;
  practice_problems: Array<{ title: string; difficulty: string; url: string }>;
  progress: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
};
