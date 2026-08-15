'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Users, Building2, Plus, ArrowRight, Loader2, Shield, Camera, Monitor, Eye, Lock, Shuffle, Clock, Target, CheckCircle2, AlertCircle, TrendingUp, Brain, Network, FileText, ChevronRight, UserPlus, Briefcase, Award, BarChart3, MailCheck, ShieldCheck, X, HelpCircle } from 'lucide-react';
import { supabase, type Company, type HiringCampaign, type CampaignCandidate, type Skill } from '@/lib/supabase';
import { toast } from 'sonner';

type Phase = 'overview' | 'create-company' | 'create-campaign' | 'campaign-detail';

export default function RecruiterPage() {
  const { user, profile } = useAuth();
  const [phase, setPhase] = useState<Phase>('overview');
  const [company, setCompany] = useState<Company | null>(null);
  const [campaigns, setCampaigns] = useState<HiringCampaign[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<HiringCampaign | null>(null);
  const [candidates, setCandidates] = useState<CampaignCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Company form
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');

  // Campaign form
  const [campaignTitle, setCampaignTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  // Typed skills
  const [difficulty, setDifficulty] = useState('intermediate');
  const [duration, setDuration] = useState(60);
  const [maxCandidates, setMaxCandidates] = useState(100);
  const [aiProctoring, setAiProctoring] = useState(true);
  const [webcamRequired, setWebcamRequired] = useState(false);
  const [screenRecording, setScreenRecording] = useState(false);
  const [tabDetection, setTabDetection] = useState(true);
  const [faceDetection, setFaceDetection] = useState(false);
  const [browserLock, setBrowserLock] = useState(true);
  const [randomization, setRandomization] = useState(true);
  const [questionTypes, setQuestionTypes] = useState<string[]>(['mcq', 'coding']);

  // Candidate invite
  const [candidateEmail, setCandidateEmail] = useState('');

  // Company email OTP verification
  const [recruiterName, setRecruiterName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyOtp, setCompanyOtp] = useState('');
  const [companyEmailVerified, setCompanyEmailVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Typed skills
  const [skillInput, setSkillInput] = useState('');
  const [typedSkills, setTypedSkills] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('company_members').select('company_id').eq('user_id', user.id).maybeSingle(),
      supabase.from('skills').select('*').order('name'),
    ]).then(async ([memberData, skillsData]) => {
      setSkills((skillsData.data as Skill[]) ?? []);
      if (memberData.data?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', memberData.data.company_id)
          .maybeSingle();
        if (companyData) {
          setCompany(companyData as Company);
          const { data: campaignData } = await supabase
            .from('hiring_campaigns')
            .select('*')
            .eq('company_id', companyData.id)
            .order('created_at', { ascending: false });
          setCampaigns((campaignData as HiringCampaign[]) ?? []);
        }
      }
      setLoading(false);
    });
  }, [user]);

  async function createCompany() {
    if (!user || !companyName.trim()) return;
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        slug,
        website: companyWebsite || null,
        industry: companyIndustry || null,
        size: companySize || null,
      })
      .select()
      .single();

    if (companyError) {
      toast.error('Failed to create company: ' + companyError.message);
      return;
    }

    const { error: memberError } = await supabase.from('company_members').insert({
      company_id: companyData.id,
      user_id: user.id,
      role: 'admin',
    });

    if (memberError) {
      toast.error('Failed to join company: ' + memberError.message);
      return;
    }

    setCompany(companyData as Company);
    setPhase('overview');
    toast.success('Company created successfully!');
  }

  async function sendCompanyOtp() {
    if (!companyEmail.trim() || !companyEmail.includes('@')) {
      toast.error('Please enter a valid company email');
      return;
    }
    setOtpSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: companyEmail.trim(),
      options: { shouldCreateUser: false, data: { company_name: companyName, recruiter_name: recruiterName } },
    });
    setOtpSending(false);
    if (error) {
      toast.error('Failed to send verification code: ' + error.message);
      return;
    }
    toast.success('Verification code sent to your company email');
    setOtpSent(true);
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function verifyCompanyOtp() {
    if (!companyOtp.trim() || companyOtp.trim().length < 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setOtpVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email: companyEmail.trim(),
      token: companyOtp.trim(),
      type: 'signup',
    });
    setOtpVerifying(false);
    if (error) {
      toast.error('Verification failed: ' + error.message);
      return;
    }
    setCompanyEmailVerified(true);
    toast.success('Company email verified!');
  }

  function addTypedSkill() {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (typedSkills.includes(trimmed)) {
      toast.error('Skill already added');
      return;
    }
    setTypedSkills([...typedSkills, trimmed]);
    setSkillInput('');
  }

  function removeTypedSkill(skill: string) {
    setTypedSkills(typedSkills.filter((s) => s !== skill));
  }

  async function createCampaign() {
    if (!user || !company || !campaignTitle.trim()) return;
    if (!companyEmailVerified) {
      toast.error('Please verify your company email first');
      return;
    }
    if (typedSkills.length === 0) {
      toast.error('Please add at least one skill to assess');
      return;
    }

    const matchedSkillIds = skills
      .filter((s) => typedSkills.some((ts) => ts.toLowerCase() === s.name.toLowerCase()))
      .map((s) => s.id);

    const { data, error } = await supabase.from('hiring_campaigns').insert({
      company_id: company.id,
      created_by: user.id,
      title: campaignTitle,
      job_description: jobDescription || null,
      skill_ids: matchedSkillIds,
      skill_names: typedSkills,
      difficulty,
      duration_minutes: duration,
      max_candidates: maxCandidates,
      ai_proctoring: aiProctoring,
      webcam_required: webcamRequired,
      screen_recording: screenRecording,
      tab_detection: tabDetection,
      face_detection: faceDetection,
      browser_lock: browserLock,
      randomization,
      question_types: questionTypes,
      status: 'active',
    }).select().single();

    if (error) {
      toast.error('Failed to create campaign: ' + error.message);
      return;
    }

    setCampaigns([data as HiringCampaign, ...campaigns]);
    setPhase('overview');
    toast.success('Hiring campaign created!');

    // Reset form
    setCampaignTitle('');
    setJobDescription('');
    setTypedSkills([]);
    setRecruiterName('');
    setCompanyEmail('');
    setCompanyOtp('');
    setCompanyEmailVerified(false);
    setOtpSent(false);
    setDifficulty('intermediate');
    setDuration(60);
    setMaxCandidates(100);
    setWebcamRequired(false);
    setScreenRecording(false);
    setFaceDetection(false);
  }

  async function inviteCandidate() {
    if (!selectedCampaign || !candidateEmail.trim()) return;

    const { error } = await supabase.from('campaign_candidates').insert({
      campaign_id: selectedCampaign.id,
      candidate_email: candidateEmail.trim(),
      status: 'invited',
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('Candidate already invited to this campaign');
      } else {
        toast.error('Failed to invite candidate: ' + error.message);
      }
      return;
    }

    toast.success(`Invitation sent to ${candidateEmail}`);
    setCandidateEmail('');
    loadCandidates(selectedCampaign.id);
  }

  async function loadCandidates(campaignId: string) {
    const { data } = await supabase
      .from('campaign_candidates')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('invited_at', { ascending: false });
    setCandidates((data as CampaignCandidate[]) ?? []);
  }

  function viewCampaign(campaign: HiringCampaign) {
    setSelectedCampaign(campaign);
    loadCandidates(campaign.id);
    setPhase('campaign-detail');
  }


  function toggleQuestionType(type: string) {
    setQuestionTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Create Company Phase
  if (!company && phase !== 'create-company') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-success" />
            Recruiter Assessment Platform
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Create hiring campaigns, invite candidates, and let AI evaluate them with proctoring. Every candidate gets a unique assessment.
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 mx-auto mb-4">
              <Building2 className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-2xl">Set Up Your Company</CardTitle>
            <CardDescription>Create a company workspace to start hiring by ability</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="lg" onClick={() => setPhase('create-company')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Company
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'create-company') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Create Your Company</h1>
          <p className="text-muted-foreground mt-1">Set up your company workspace</p>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyWebsite">Website</Label>
              <Input id="companyWebsite" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://acme.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyIndustry">Industry</Label>
                <Input id="companyIndustry" value={companyIndustry} onChange={(e) => setCompanyIndustry(e.target.value)} placeholder="Technology" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companySize">Company Size</Label>
                <Select value={companySize} onValueChange={setCompanySize}>
                  <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10</SelectItem>
                    <SelectItem value="11-50">11-50</SelectItem>
                    <SelectItem value="51-200">51-200</SelectItem>
                    <SelectItem value="201-1000">201-1000</SelectItem>
                    <SelectItem value="1000+">1000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={createCompany} disabled={!companyName.trim()} className="flex-1">
                Create Company
              </Button>
              <Button variant="outline" onClick={() => setPhase('overview')}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Campaign Detail Phase
  if (phase === 'campaign-detail' && selectedCampaign) {
    const completedCandidates = candidates.filter((c) => c.status === 'completed');
    const avgScore = completedCandidates.length > 0
      ? Math.round(completedCandidates.reduce((acc, c) => acc + (Number(c.score) ?? 0), 0) / completedCandidates.length)
      : 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPhase('overview')}>
            ← Back to Campaigns
          </Button>
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{selectedCampaign.title}</h1>
          <p className="text-muted-foreground mt-1">
            {selectedCampaign.difficulty} · {selectedCampaign.duration_minutes} min · {candidates.length} candidates
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-5">
            <div className="flex items-center gap-2 text-primary mb-2"><Users className="h-5 w-5" /><span className="text-sm text-muted-foreground">Invited</span></div>
            <div className="font-display text-3xl font-bold">{candidates.length}</div>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <div className="flex items-center gap-2 text-success mb-2"><CheckCircle2 className="h-5 w-5" /><span className="text-sm text-muted-foreground">Completed</span></div>
            <div className="font-display text-3xl font-bold">{completedCandidates.length}</div>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <div className="flex items-center gap-2 text-accent mb-2"><TrendingUp className="h-5 w-5" /><span className="text-sm text-muted-foreground">Avg Score</span></div>
            <div className="font-display text-3xl font-bold">{avgScore}%</div>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <div className="flex items-center gap-2 text-warning mb-2"><Clock className="h-5 w-5" /><span className="text-sm text-muted-foreground">Duration</span></div>
            <div className="font-display text-3xl font-bold">{selectedCampaign.duration_minutes}m</div>
          </CardContent></Card>
        </div>

        {/* Proctoring Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Proctoring Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'AI Proctoring', enabled: selectedCampaign.ai_proctoring, icon: Shield },
                { label: 'Webcam', enabled: selectedCampaign.webcam_required, icon: Camera },
                { label: 'Screen Recording', enabled: selectedCampaign.screen_recording, icon: Monitor },
                { label: 'Tab Detection', enabled: selectedCampaign.tab_detection, icon: Eye },
                { label: 'Face Detection', enabled: selectedCampaign.face_detection, icon: Users },
                { label: 'Browser Lock', enabled: selectedCampaign.browser_lock, icon: Lock },
                { label: 'Randomization', enabled: selectedCampaign.randomization, icon: Shuffle },
              ].map((setting) => {
                const Icon = setting.icon;
                return (
                  <div key={setting.label} className={`flex items-center gap-2 rounded-lg border p-3 ${setting.enabled ? 'border-success/30 bg-success/5' : 'opacity-50'}`}>
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{setting.label}</span>
                    {setting.enabled && <CheckCircle2 className="h-3.5 w-3.5 text-success ml-auto" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Invite Candidate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Invite Candidate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="candidate@example.com"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && inviteCandidate()}
              />
              <Button onClick={inviteCandidate} disabled={!candidateEmail.trim()}>
                Send Invite
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Candidates List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidates ({candidates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {candidates.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No candidates invited yet. Use the form above to invite someone.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold">
                          {candidate.candidate_email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{candidate.candidate_email}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Invited {new Date(candidate.invited_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={candidate.status === 'completed' ? 'default' : candidate.status === 'invited' ? 'secondary' : 'outline'}
                          className="capitalize"
                        >
                          {candidate.status}
                        </Badge>
                        {candidate.score !== null && (
                          <div className="text-right">
                            <div className="font-display text-lg font-bold">{Math.round(Number(candidate.score))}%</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detailed results for completed candidates */}
                    {candidate.status === 'completed' && candidate.score !== null && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground">Cheating Probability</div>
                            <div className={`font-medium ${Number(candidate.cheating_probability) < 20 ? 'text-success' : Number(candidate.cheating_probability) > 50 ? 'text-destructive' : 'text-warning'}`}>
                              {Math.round(Number(candidate.cheating_probability))}%
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Confidence</div>
                            <div className="font-medium">{Math.round(Number(candidate.confidence))}%</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Recommendation</div>
                            <div className="font-medium">{candidate.hiring_recommendation ?? 'Pending'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Completed</div>
                            <div className="font-medium text-xs">{candidate.completed_at ? new Date(candidate.completed_at).toLocaleDateString() : '—'}</div>
                          </div>
                        </div>

                        {candidate.strengths && candidate.strengths.length > 0 && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Strengths</div>
                            <div className="flex flex-wrap gap-1.5">
                              {candidate.strengths.map((s, i) => (
                                <Badge key={i} variant="outline" className="text-xs text-success border-success/30">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {candidate.weaknesses && candidate.weaknesses.length > 0 && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Weaknesses</div>
                            <div className="flex flex-wrap gap-1.5">
                              {candidate.weaknesses.map((w, i) => (
                                <Badge key={i} variant="outline" className="text-xs text-destructive border-destructive/30">{w}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {candidate.interview_suggestions && candidate.interview_suggestions.length > 0 && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Interview Suggestions</div>
                            <ul className="space-y-1">
                              {candidate.interview_suggestions.map((s, i) => (
                                <li key={i} className="text-xs flex items-start gap-1.5">
                                  <Brain className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Create Campaign Phase
  if (phase === 'create-campaign') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPhase('overview')}>
            ← Back to Campaigns
          </Button>
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold">Create Hiring Campaign</h1>
          <p className="text-muted-foreground mt-1">Configure assessment settings and proctoring options</p>
        </div>

        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Basic Information</h3>
              <div className="space-y-2">
                <Label htmlFor="campaignTitle">Campaign Title *</Label>
                <Input id="campaignTitle" value={campaignTitle} onChange={(e) => setCampaignTitle(e.target.value)} placeholder="Senior Python Developer" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobDescription">Job Description</Label>
                <Textarea id="jobDescription" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job description here..." rows={5} />
              </div>
            </div>

            {/* Recruiter & Company Email Verification */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Recruiter Verification</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="recruiterName">Recruiter Name *</Label>
                  <Input id="recruiterName" value={recruiterName} onChange={(e) => setRecruiterName(e.target.value)} placeholder="John Smith" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Official Company Email *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="companyEmail"
                      type="email"
                      value={companyEmail}
                      onChange={(e) => { setCompanyEmail(e.target.value); setCompanyEmailVerified(false); setOtpSent(false); }}
                      placeholder="recruiter@company.com"
                      disabled={companyEmailVerified}
                    />
                    {!companyEmailVerified && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={sendCompanyOtp}
                        disabled={!companyEmail.trim() || otpSending || resendCooldown > 0}
                        className="shrink-0"
                      >
                        {otpSending ? <Loader2 className="h-4 w-4 animate-spin" /> : otpSent ? `Resend (${resendCooldown}s)` : 'Send Code'}
                      </Button>
                    )}
                  </div>
                </div>
                {companyEmailVerified && (
                  <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-3">
                    <ShieldCheck className="h-4 w-4 text-success" />
                    <span className="text-sm text-success font-medium">Company email verified</span>
                  </div>
                )}
                {otpSent && !companyEmailVerified && (
                  <div className="space-y-2">
                    <Label htmlFor="companyOtp">Verification Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="companyOtp"
                        placeholder="Enter 6-digit code"
                        value={companyOtp}
                        onChange={(e) => setCompanyOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="text-center text-xl tracking-[0.3em] font-bold h-12"
                        inputMode="numeric"
                      />
                      <Button type="button" onClick={verifyCompanyOtp} disabled={companyOtp.trim().length < 6 || otpVerifying} className="shrink-0">
                        {otpVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Skills to Assess - Typed Input */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Skills to Assess</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a skill and press Enter (e.g., Python, SQL, React...)"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTypedSkill();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addTypedSkill} disabled={!skillInput.trim()} className="shrink-0">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                {skillInput.trim() && (
                  <div className="flex flex-wrap gap-1.5">
                    {skills
                      .filter((s) => s.name.toLowerCase().includes(skillInput.toLowerCase()) && !typedSkills.includes(s.name))
                      .slice(0, 5)
                      .map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setTypedSkills([...typedSkills, s.name]); setSkillInput(''); }}
                          className="rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs hover:border-primary/50 hover:bg-primary/5 transition-all"
                        >
                          {s.name}
                        </button>
                      ))}
                  </div>
                )}
                {typedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {typedSkills.map((skill) => (
                      <div key={skill} className="flex items-center gap-1.5 rounded-lg border border-primary bg-primary/10 px-3 py-1.5 text-sm text-primary">
                        {skill}
                        <button type="button" onClick={() => removeTypedSkill(skill)} className="ml-1 hover:text-destructive transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {typedSkills.length === 0 && !skillInput.trim() && (
                  <p className="text-xs text-muted-foreground">Type the skills you want to assess. You can add as many as you need.</p>
                )}
              </div>
            </div>

            {/* Assessment Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Assessment Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={15} max={180} />
                </div>
                <div className="space-y-2">
                  <Label>Max Candidates</Label>
                  <Input type="number" value={maxCandidates} onChange={(e) => setMaxCandidates(Number(e.target.value))} min={1} max={10000} />
                </div>
              </div>
            </div>

            {/* Question Types */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Question Types</h3>
              <div className="flex flex-wrap gap-2">
                {['mcq', 'coding', 'case_study', 'sql', 'system_design', 'behavior', 'debugging', 'communication'].map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleQuestionType(type)}
                    className={`rounded-lg border px-3 py-1.5 text-sm capitalize transition-all ${
                      questionTypes.includes(type)
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Proctoring */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">AI Proctoring</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'AI Proctoring', desc: 'AI-powered cheating detection', value: aiProctoring, setter: setAiProctoring, icon: Shield },
                  { label: 'Webcam Required', desc: 'Camera must be on during assessment', value: webcamRequired, setter: setWebcamRequired, icon: Camera },
                  { label: 'Screen Recording', desc: 'Record candidate\'s screen', value: screenRecording, setter: setScreenRecording, icon: Monitor },
                  { label: 'Tab Detection', desc: 'Detect when candidate switches tabs', value: tabDetection, setter: setTabDetection, icon: Eye },
                  { label: 'Face Detection', desc: 'Verify face is visible at all times', value: faceDetection, setter: setFaceDetection, icon: Users },
                  { label: 'Browser Lock', desc: 'Lock browser to assessment tab', value: browserLock, setter: setBrowserLock, icon: Lock },
                  { label: 'Randomization', desc: 'Shuffle questions per candidate', value: randomization, setter: setRandomization, icon: Shuffle },
                ].map((setting) => {
                  const Icon = setting.icon;
                  return (
                    <div key={setting.label} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{setting.label}</div>
                          <div className="text-xs text-muted-foreground">{setting.desc}</div>
                        </div>
                      </div>
                      <Switch checked={setting.value} onCheckedChange={setting.setter} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={createCampaign} disabled={!campaignTitle.trim() || !companyEmailVerified || typedSkills.length === 0 || !recruiterName.trim()} className="flex-1" size="lg">
                Create Campaign
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setPhase('overview')}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Overview Phase
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-success" />
            Recruiter Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            {company?.name} · Create campaigns and hire by ability
          </p>
        </div>
        <Button onClick={() => setPhase('create-campaign')} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-primary mb-2"><Briefcase className="h-5 w-5" /><span className="text-sm text-muted-foreground">Campaigns</span></div>
          <div className="font-display text-3xl font-bold">{campaigns.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-success mb-2"><CheckCircle2 className="h-5 w-5" /><span className="text-sm text-muted-foreground">Active</span></div>
          <div className="font-display text-3xl font-bold">{campaigns.filter((c) => c.status === 'active').length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-accent mb-2"><Users className="h-5 w-5" /><span className="text-sm text-muted-foreground">Total Candidates</span></div>
          <div className="font-display text-3xl font-bold">{candidates.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-warning mb-2"><Award className="h-5 w-5" /><span className="text-sm text-muted-foreground">Avg Score</span></div>
          <div className="font-display text-3xl font-bold">—</div>
        </CardContent></Card>
      </div>

      {/* Campaigns */}
      <div>
        <h2 className="font-display text-xl font-semibold mb-3">Your Campaigns</h2>
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No campaigns yet. Create your first hiring campaign.</p>
              <Button onClick={() => setPhase('create-campaign')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="group cursor-pointer hover:border-success/50 hover:shadow-lg transition-all" onClick={() => viewCampaign(campaign)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{campaign.title}</CardTitle>
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                      {campaign.status}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {campaign.difficulty}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {campaign.duration_minutes}m</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {campaign.max_candidates} max</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {campaign.skill_names?.slice(0, 3).map((name) => (
                        <Badge key={name} variant="outline" className="text-xs">{name}</Badge>
                      ))}
                      {campaign.skill_names && campaign.skill_names.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{campaign.skill_names.length - 3}</Badge>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {campaign.ai_proctoring && <Shield className="h-3.5 w-3.5 text-success" />}
                    {campaign.webcam_required && <Camera className="h-3.5 w-3.5 text-muted-foreground" />}
                    {campaign.tab_detection && <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                    {campaign.browser_lock && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
