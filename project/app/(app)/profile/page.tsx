'use client';

import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, Shield, TrendingUp, Flame, Zap, Award, Mail, Calendar, Edit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase, type SkillAssessment, type Skill, type DiagnosisSession } from '@/lib/supabase';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [sessions, setSessions] = useState<DiagnosisSession[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('skill_assessments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('skills').select('*'),
      supabase.from('diagnosis_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]).then(([a, s, d]) => {
      setAssessments((a.data as SkillAssessment[]) ?? []);
      setSkills((s.data as Skill[]) ?? []);
      setSessions((d.data as DiagnosisSession[]) ?? []);
    });
  }, [user]);

  const verifiedSkills = assessments.filter((a) => a.verified);

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
        <CardHeader className="relative">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl font-bold">
                {profile?.full_name?.charAt(0).toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="font-display text-3xl font-bold">{profile?.full_name ?? 'User'}</h1>
              <p className="text-muted-foreground mt-1">{profile?.headline ?? profile?.email}</p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <Badge variant="secondary" className="capitalize">{profile?.role}</Badge>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {profile?.email}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Recently'}
                </div>
              </div>
              {profile?.bio && <p className="text-sm text-muted-foreground mt-4 max-w-2xl">{profile.bio}</p>}
            </div>
            <Button variant="outline" asChild>
              <Link href="/settings">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-warning mb-2"><Flame className="h-5 w-5" /><span className="text-sm text-muted-foreground">Streak</span></div>
          <div className="font-display text-3xl font-bold">{profile?.learning_streak ?? 0}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-success mb-2"><Shield className="h-5 w-5" /><span className="text-sm text-muted-foreground">Verified</span></div>
          <div className="font-display text-3xl font-bold">{verifiedSkills.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-primary mb-2"><TrendingUp className="h-5 w-5" /><span className="text-sm text-muted-foreground">Diagnoses</span></div>
          <div className="font-display text-3xl font-bold">{sessions.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-accent mb-2"><Zap className="h-5 w-5" /><span className="text-sm text-muted-foreground">Total XP</span></div>
          <div className="font-display text-3xl font-bold">{profile?.total_xp ?? 0}</div>
        </CardContent></Card>
      </div>

      {/* Verified Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-success" /> Verified Skills</CardTitle>
          <CardDescription>Skills verified through AI assessment</CardDescription>
        </CardHeader>
        <CardContent>
          {verifiedSkills.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No verified skills yet.</p>
              <Button asChild><Link href="/marketplace">Verify your first skill</Link></Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {verifiedSkills.map((sa) => {
                const skill = skills.find((s) => s.id === sa.skill_id);
                return (
                  <div key={sa.id} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                        <Shield className="h-5 w-5 text-success" />
                      </div>
                      <Badge variant="default" className="bg-success text-success-foreground">Verified</Badge>
                    </div>
                    <div className="font-medium">{skill?.name ?? 'Unknown'}</div>
                    <div className="font-display text-2xl font-bold mt-1">{Math.round(Number(sa.score))}%</div>
                    <div className="text-xs text-muted-foreground mt-0.5 capitalize">{sa.industry_readiness}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Assessments */}
      {assessments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Skill Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assessments.map((sa) => {
                const skill = skills.find((s) => s.id === sa.skill_id);
                return (
                  <div key={sa.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                        <Sparkles className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{skill?.name ?? 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{sa.status} · {sa.completed_at ? new Date(sa.completed_at).toLocaleDateString() : 'In progress'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-bold">{Math.round(Number(sa.score))}%</span>
                      {sa.verified && <Badge variant="default" className="bg-success text-success-foreground">Verified</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
