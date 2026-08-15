'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Clock, Target, ArrowRight, CheckCircle2, Building2, Shield, Camera, Monitor, Eye, Lock } from 'lucide-react';
import { supabase, type CampaignCandidate, type HiringCampaign, type Company, type Skill } from '@/lib/supabase';
import Link from 'next/link';
import { toast } from 'sonner';

type TestWithDetails = CampaignCandidate & {
  campaign: HiringCampaign;
  company: Company;
  skills: Skill[];
};

export default function MyTestsPage() {
  const { user } = useAuth();
  const [tests, setTests] = useState<TestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadTests();
  }, [user]);

  async function loadTests() {
    if (!user) return;

    // Get candidates where email matches user's email or candidate_id matches
    const { data: candidates, error } = await supabase
      .from('campaign_candidates')
      .select('*')
      .or(`candidate_email.eq.${user.email},candidate_id.eq.${user.id}`)
      .order('invited_at', { ascending: false });

    if (error) {
      toast.error('Failed to load tests');
      setLoading(false);
      return;
    }

    if (!candidates || candidates.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch related campaigns, companies, and skills
    const campaignIds = Array.from(new Set(candidates.map((c) => c.campaign_id)));
    const { data: campaigns } = await supabase
      .from('hiring_campaigns')
      .select('*')
      .in('id', campaignIds);

    const companyIds = Array.from(new Set((campaigns ?? []).map((c) => c.company_id)));
    const { data: companies } = await supabase
      .from('companies')
      .select('*')
      .in('id', companyIds);

    const allSkillIds = Array.from(new Set(
      (campaigns ?? []).flatMap((c) => c.skill_ids ?? []),
    ));
    const { data: skills } = await supabase
      .from('skills')
      .select('*')
      .in('id', allSkillIds);

    const testsWithDetails: TestWithDetails[] = (candidates as CampaignCandidate[]).map((cand) => {
      const campaign = (campaigns ?? []).find((c) => c.id === cand.campaign_id) as HiringCampaign;
      const company = (companies ?? []).find((c) => c.id === campaign?.company_id) as Company;
      const testSkills = (skills ?? []).filter((s) => campaign?.skill_ids?.includes(s.id));
      return { ...cand, campaign, company, skills: testSkills };
    }).filter((t) => t.campaign && t.company);

    setTests(testsWithDetails);
    setLoading(false);
  }

  async function startTest(test: TestWithDetails) {
    if (!user) return;

    // Claim the test by setting candidate_id and status to in_progress
    const { error } = await supabase
      .from('campaign_candidates')
      .update({
        candidate_id: user.id,
        status: 'in_progress',
      })
      .eq('id', test.id);

    if (error) {
      toast.error('Failed to start test: ' + error.message);
      return;
    }

    toast.success('Test started! Good luck.');
    window.location.href = `/my-tests/${test.id}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingTests = tests.filter((t) => t.status === 'invited' || t.status === 'in_progress');
  const completedTests = tests.filter((t) => t.status === 'completed');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          My Assessments
        </h1>
        <p className="text-muted-foreground mt-2">
          Tests and assessments you've been invited to by recruiters
        </p>
      </div>

      {/* Pending Tests */}
      <div>
        <h2 className="font-display text-xl font-semibold mb-4">Pending ({pendingTests.length})</h2>
        {pendingTests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No pending assessments. When a recruiter invites you, the test will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {pendingTests.map((test) => (
              <Card key={test.id} className="group hover:border-primary/50 hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{test.campaign.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 mt-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {test.company.name}
                      </CardDescription>
                    </div>
                    <Badge variant={test.status === 'in_progress' ? 'default' : 'secondary'}>
                      {test.status === 'in_progress' ? 'In Progress' : 'Invited'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {test.campaign.job_description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {test.campaign.job_description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      {test.campaign.difficulty}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {test.campaign.duration_minutes} min
                    </span>
                  </div>

                  {/* Skills */}
                  {test.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {test.skills.map((skill) => (
                        <Badge key={skill.id} variant="outline" className="text-xs">
                          {skill.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Proctoring indicators */}
                  <div className="flex items-center gap-2">
                    {test.campaign.ai_proctoring && <Shield className="h-4 w-4 text-success" />}
                    {test.campaign.webcam_required && <Camera className="h-4 w-4 text-muted-foreground" />}
                    {test.campaign.screen_recording && <Monitor className="h-4 w-4 text-muted-foreground" />}
                    {test.campaign.tab_detection && <Eye className="h-4 w-4 text-muted-foreground" />}
                    {test.campaign.browser_lock && <Lock className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground ml-1">AI Proctoring Enabled</span>
                  </div>

                  <Button
                    className="w-full group/btn"
                    onClick={() => startTest(test)}
                  >
                    {test.status === 'in_progress' ? 'Continue Test' : 'Start Test'}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Tests */}
      {completedTests.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-semibold mb-4">Completed ({completedTests.length})</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {completedTests.map((test) => (
              <Card key={test.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{test.campaign.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 mt-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {test.company.name}
                      </CardDescription>
                    </div>
                    <Badge variant="default" className="bg-success text-success-foreground">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Completed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Score</div>
                      <div className="font-display text-xl font-bold">{Math.round(Number(test.score))}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Confidence</div>
                      <div className="font-display text-xl font-bold">{Math.round(Number(test.confidence))}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Integrity</div>
                      <div className="font-display text-xl font-bold text-success">
                        {Math.round(100 - Number(test.cheating_probability))}%
                      </div>
                    </div>
                  </div>
                  {test.hiring_recommendation && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground">Recommendation</div>
                      <div className="text-sm font-medium">{test.hiring_recommendation}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
