'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, Flame, Trophy, Target, TrendingUp, Calendar, ArrowRight, Sparkles, BookOpen, Zap, Network, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';
import { supabase, type DiagnosisSession, type SkillAssessment, type LearningPlan, type Skill } from '@/lib/supabase';
import { KnowledgeGraphViz } from '@/components/knowledge-graph-viz';

type DailyGoal = {
  label: string;
  target: number;
  current: number;
  done: boolean;
  progress: number;
  href: string;
};

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [diagnosisSessions, setDiagnosisSessions] = useState<DiagnosisSession[]>([]);
  const [skillAssessments, setSkillAssessments] = useState<SkillAssessment[]>([]);
  const [learningPlans, setLearningPlans] = useState<LearningPlan[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('diagnosis_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('skill_assessments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('learning_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
      supabase.from('skills').select('*').order('name'),
    ]).then(([sessions, assessments, plans, skillsData]) => {
      setDiagnosisSessions((sessions.data as DiagnosisSession[]) ?? []);
      setSkillAssessments((assessments.data as SkillAssessment[]) ?? []);
      setLearningPlans((plans.data as LearningPlan[]) ?? []);
      setSkills((skillsData.data as Skill[]) ?? []);
      setLoading(false);
    });
  }, [user]);

  const verifiedSkills = skillAssessments.filter((s) => s.verified);
  const avgScore = skillAssessments.length > 0
    ? Math.round(skillAssessments.reduce((acc, s) => acc + Number(s.score), 0) / skillAssessments.length)
    : 0;

  // Compute daily goals dynamically from today's activity
  const todaysDiagnoses = diagnosisSessions.filter((s) => isToday(s.created_at));
  const todaysAssessments = skillAssessments.filter((s) => isToday(s.completed_at ?? s.created_at));
  const todaysVerifications = todaysAssessments.filter((s) => s.verified);
  const hasActivePlan = learningPlans.length > 0;
  const planReviewedToday = learningPlans.some((p) => isToday(p.updated_at) && Number(p.progress) > 0);

  // Goals adapt to user level — more advanced users get tougher targets
  const userLevel = verifiedSkills.length >= 5 ? 'advanced' : verifiedSkills.length >= 2 ? 'intermediate' : 'beginner';
  const diagnosisTarget = userLevel === 'advanced' ? 2 : 1;
  const assessmentTarget = userLevel === 'advanced' ? 2 : 1;
  const practiceTarget = userLevel === 'advanced' ? 5 : 3;

  const dailyGoals: DailyGoal[] = [
    {
      label: `Complete ${diagnosisTarget} diagnosis session${diagnosisTarget > 1 ? 's' : ''}`,
      target: diagnosisTarget,
      current: Math.min(todaysDiagnoses.length, diagnosisTarget),
      done: todaysDiagnoses.length >= diagnosisTarget,
      progress: Math.min(100, Math.round((todaysDiagnoses.length / diagnosisTarget) * 100)),
      href: '/diagnosis',
    },
    {
      label: `Verify ${assessmentTarget} skill${assessmentTarget > 1 ? 's' : ''}`,
      target: assessmentTarget,
      current: Math.min(todaysVerifications.length, assessmentTarget),
      done: todaysVerifications.length >= assessmentTarget,
      progress: Math.min(100, Math.round((todaysVerifications.length / assessmentTarget) * 100)),
      href: '/marketplace',
    },
    {
      label: `Complete ${practiceTarget} practice assessment${practiceTarget > 1 ? 's' : ''}`,
      target: practiceTarget,
      current: Math.min(todaysAssessments.length, practiceTarget),
      done: todaysAssessments.length >= practiceTarget,
      progress: Math.min(100, Math.round((todaysAssessments.length / practiceTarget) * 100)),
      href: '/marketplace',
    },
    {
      label: 'Review your learning plan',
      target: 1,
      current: planReviewedToday ? 1 : 0,
      done: planReviewedToday,
      progress: planReviewedToday ? 100 : hasActivePlan ? 50 : 0,
      href: '/diagnosis',
    },
  ];

  const goalsCompleted = dailyGoals.filter((g) => g.done).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Learner'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your skill intelligence overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/diagnosis">
              <Brain className="mr-2 h-4 w-4" />
              New Diagnosis
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/marketplace">
              <Sparkles className="mr-2 h-4 w-4" />
              Verify a Skill
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-warning/10 blur-2xl" />
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-warning mb-2">
              <Flame className="h-5 w-5" />
              <span className="text-sm font-medium text-muted-foreground">Learning Streak</span>
            </div>
            <div className="font-display text-3xl font-bold">{profile?.learning_streak ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">days · best: {profile?.longest_streak ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-success/10 blur-2xl" />
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-success mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium text-muted-foreground">Verified Skills</span>
            </div>
            <div className="font-display text-3xl font-bold">{verifiedSkills.length}</div>
            <div className="text-xs text-muted-foreground mt-1">badges earned</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-primary mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium text-muted-foreground">Avg Score</span>
            </div>
            <div className="font-display text-3xl font-bold">{avgScore}%</div>
            <div className="text-xs text-muted-foreground mt-1">across all skills</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-accent/10 blur-2xl" />
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-accent mb-2">
              <Zap className="h-5 w-5" />
              <span className="text-sm font-medium text-muted-foreground">Total XP</span>
            </div>
            <div className="font-display text-3xl font-bold">{profile?.total_xp ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">points earned</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Knowledge Graph */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-primary" />
                  Your Knowledge Graph
                </CardTitle>
                <CardDescription>Concept mastery across all assessed skills</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <KnowledgeGraphViz sessions={diagnosisSessions} assessments={skillAssessments} skills={skills} />
          </CardContent>
        </Card>

        {/* Learning Streak / Goals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-warning" />
                  Daily Goals
                </CardTitle>
                <CardDescription>
                  {goalsCompleted}/{dailyGoals.length} completed today
                </CardDescription>
              </div>
              <Badge variant={goalsCompleted === dailyGoals.length ? 'default' : 'secondary'}
                className={goalsCompleted === dailyGoals.length ? 'bg-success text-success-foreground' : ''}>
                {userLevel}
                </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {dailyGoals.map((goal) => (
              <Link key={goal.label} href={goal.href} className="block space-y-1.5 group">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {goal.done ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={`group-hover:text-primary transition-colors ${goal.done ? 'text-muted-foreground line-through' : ''}`}>
                      {goal.label}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {goal.current}/{goal.target}
                  </span>
                </div>
                <Progress value={goal.progress} className="h-1.5" />
              </Link>
            ))}
            {goalsCompleted === dailyGoals.length && (
              <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
                <Trophy className="h-4 w-4" />
                All goals completed! Great work today.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Diagnosis Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Recent Diagnoses
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/diagnosis">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {diagnosisSessions.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">No diagnosis sessions yet.</p>
                <Button size="sm" asChild>
                  <Link href="/diagnosis">Start your first diagnosis</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {diagnosisSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="font-medium text-sm">{session.topic}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {session.question_count} questions · {session.status}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg font-bold">{Math.round(session.confidence)}%</div>
                      <div className="text-xs text-muted-foreground">confidence</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skill Assessments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Skill Assessments
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/marketplace">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {skillAssessments.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">No skill assessments yet.</p>
                <Button size="sm" asChild>
                  <Link href="/marketplace">Verify your first skill</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {skillAssessments.slice(0, 5).map((sa) => {
                  const skill = skills.find((s) => s.id === sa.skill_id);
                  return (
                    <div key={sa.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                          <Sparkles className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{skill?.name ?? 'Unknown Skill'}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {sa.verified ? 'Verified' : sa.status}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="font-display text-lg font-bold">{Math.round(Number(sa.score))}%</div>
                        </div>
                        {sa.verified && (
                          <Badge variant="default" className="bg-success text-success-foreground">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Learning Plans */}
      {learningPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Active Learning Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {learningPlans.map((plan) => (
                <div key={plan.id} className="rounded-lg border p-4 space-y-3">
                  <div>
                    <div className="font-medium">{plan.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {plan.estimated_days} days · {plan.status}
                    </div>
                  </div>
                  {plan.root_cause && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Root cause: </span>
                      <span className="font-medium">{plan.root_cause}</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{Math.round(Number(plan.progress))}%</span>
                    </div>
                    <Progress value={Number(plan.progress)} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Leaderboard
          </CardTitle>
          <CardDescription>Top learners this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { rank: 1, name: 'Alex Chen', xp: 12450, skills: 12, streak: 47 },
              { rank: 2, name: 'Priya Sharma', xp: 11200, skills: 10, streak: 32 },
              { rank: 3, name: 'James Wilson', xp: 9800, skills: 8, streak: 28 },
              { rank: 4, name: profile?.full_name ?? 'You', xp: profile?.total_xp ?? 0, skills: verifiedSkills.length, streak: profile?.learning_streak ?? 0, isYou: true },
              { rank: 5, name: 'Maria Garcia', xp: 7600, skills: 6, streak: 19 },
            ].map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center gap-4 rounded-lg p-3 ${
                  entry.isYou ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50'
                } transition-colors`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  entry.rank === 1 ? 'bg-warning text-warning-foreground' :
                  entry.rank === 2 ? 'bg-muted-foreground text-background' :
                  entry.rank === 3 ? 'bg-orange-500/20 text-orange-500' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {entry.rank}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {entry.name}
                    {entry.isYou && <Badge variant="secondary" className="ml-2 text-xs">You</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.skills} verified skills · {entry.streak} day streak
                  </div>
                </div>
                <div className="font-display text-lg font-bold">{entry.xp.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
