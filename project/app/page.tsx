'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles, Users, ArrowRight, CheckCircle2, TrendingUp, Target, Network, Zap, Shield, BarChart3, GitBranch, Trophy, BookOpen, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Navbar } from '@/components/navbar';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-primary/10 blur-[120px]" />

        <div className="container relative mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium animate-fade-in-up">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI-Powered Skill Intelligence Platform
            </Badge>
            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-balance animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Find Knowledge Gaps.
              <br />
              <span className="gradient-text">Verify Skills.</span>{' '}
              <span className="text-foreground">Hire by Ability.</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg md:text-xl text-muted-foreground text-balance animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              The world's first platform that discovers <em className="text-foreground not-italic font-medium">why</em> someone can't solve problems —
              finds the root cause, builds a personalized learning path, and verifies real skills for hiring.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Button size="lg" asChild className="h-12 px-8 text-base shadow-glow">
                <Link href="/auth/sign-up">
                  Start Your Diagnosis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
                <Link href="/auth/sign-in">
                  Sign In
                </Link>
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              {['No credit card required', 'Free for students', 'Enterprise-ready'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border/40 bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '90%+', label: 'Root Cause Accuracy', icon: Target },
              { value: '10K+', label: 'Concepts Mapped', icon: Network },
              { value: '95%', label: 'Skill Verification Threshold', icon: Shield },
              { value: '3x', label: 'Faster Hiring', icon: Zap },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="font-display text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge variant="outline" className="mb-4">The Problem</Badge>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-balance">
              Education measures marks. Companies measure interviews.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground text-balance">
              Neither discovers <span className="text-foreground font-semibold">why</span> someone cannot solve problems.
              We fix that.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { title: 'Traditional Education', desc: 'Measures marks, not understanding. A student can pass an exam without truly grasping the fundamentals.', icon: BookOpen },
              { title: 'Traditional Hiring', desc: 'Measures interview performance, not ability. Great engineers fail bad interviews. Bad engineers pass good ones.', icon: Users },
              { title: 'The SkillSynk Way', desc: 'We find the actual knowledge gap, trace it to its root cause, and verify real skills through adaptive assessment.', icon: Brain },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="relative overflow-hidden">
                  <CardHeader>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-2">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">{item.desc}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Three Modules */}
      <section className="py-24 bg-muted/30 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge variant="outline" className="mb-4">Three Products. One Platform.</Badge>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-balance">
              The complete skill intelligence stack
            </h2>
            <p className="mt-6 text-lg text-muted-foreground text-balance">
              From finding gaps to verifying skills to hiring by ability — everything connected.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Module 1 */}
            <Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-glow">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:opacity-100" />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Brain className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary">Module 1</Badge>
                </div>
                <CardTitle className="text-2xl mt-4">Knowledge Gap Diagnosis</CardTitle>
                <CardDescription className="text-base">
                  An AI Diagnostic Tutor that never answers — it asks. Socratic questioning, Bayesian reasoning, and concept dependency mapping find the real root cause.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {['Adaptive Socratic questioning', 'Concept dependency graph', 'Root cause + confidence score', 'Personalized learning roadmap'].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    {feature}
                  </div>
                ))}
                <Button variant="ghost" className="w-full mt-4 group/btn" asChild>
                  <Link href="/auth/sign-up">
                    Try Diagnosis
                    <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Module 2 */}
            <Card className="group relative overflow-hidden border-2 hover:border-accent/50 transition-all duration-300 hover:shadow-glow">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-accent/5 blur-2xl" />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary">Module 2</Badge>
                </div>
                <CardTitle className="text-2xl mt-4">Skill Marketplace</CardTitle>
                <CardDescription className="text-base">
                  Degrees don't matter. Skills do. Anyone can get their skills verified through adaptive assessment and earn public verified badges.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {['MCQs, coding, debugging, case studies', 'AI stops at 95% confidence', 'Verified skill badges', 'Recruiters search verified profiles'].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    {feature}
                  </div>
                ))}
                <Button variant="ghost" className="w-full mt-4 group/btn" asChild>
                  <Link href="/auth/sign-up">
                    Get Verified
                    <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Module 3 */}
            <Card className="group relative overflow-hidden border-2 hover:border-success/50 transition-all duration-300 hover:shadow-glow">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-success/5 blur-2xl" />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success text-success-foreground">
                    <Users className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary">Module 3</Badge>
                </div>
                <CardTitle className="text-2xl mt-4">Recruiter Assessment</CardTitle>
                <CardDescription className="text-base">
                  Companies create hiring campaigns with AI proctoring, webcam monitoring, and tab detection. Every candidate gets a unique assessment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {['AI proctoring + cheating detection', 'Unique assessment per candidate', 'Skill radar + hiring recommendation', 'Knowledge graph per candidate'].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    {feature}
                  </div>
                ))}
                <Button variant="ghost" className="w-full mt-4 group/btn" asChild>
                  <Link href="/auth/sign-up">
                    Hire by Ability
                    <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works — Diagnosis Flow */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-balance">
              The AI doesn't answer. It asks.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground text-balance">
              Like an expert teacher, the AI traces every gap back to its root cause through adaptive Socratic questioning.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              {[
                { step: 1, title: 'User says: "I cannot understand Machine Learning"', isUser: true },
                { step: 2, title: 'AI asks: "What is a matrix?"', isUser: false },
                { step: 3, title: 'AI asks: "What is vector multiplication?"', isUser: false },
                { step: 4, title: 'AI asks: "What is a gradient?"', isUser: false },
                { step: 5, title: 'AI asks: "What is a derivative?"', isUser: false },
                { step: 6, title: 'AI asks: "What is calculus?"', isUser: false },
                { step: 7, title: 'Root Cause Found: Linear Algebra missing — Confidence: 96%', isResult: true },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 animate-fade-in-up ${item.isResult ? 'mt-6' : ''}`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    item.isResult
                      ? 'bg-success text-success-foreground'
                      : item.isUser
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-primary text-primary-foreground'
                  }`}>
                    {item.isResult ? <CheckCircle2 className="h-5 w-5" /> : item.step}
                  </div>
                  <div className={`flex-1 rounded-xl border p-4 ${
                    item.isResult
                      ? 'border-success/30 bg-success/5'
                      : item.isUser
                      ? 'border-accent/20 bg-accent/5'
                      : 'border-border bg-card'
                  }`}>
                    <p className={`text-sm ${item.isResult ? 'font-semibold' : ''}`}>
                      {item.isResult && <Trophy className="inline mr-2 h-4 w-4 text-success" />}
                      {item.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-muted/30 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge variant="outline" className="mb-4">Platform Features</Badge>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-balance">
              Everything you need to understand and verify skills
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Network, title: 'Knowledge Graph', desc: 'Every concept mapped with prerequisites, confidence, mastery, and evidence.' },
              { icon: TrendingUp, title: 'Adaptive Assessment', desc: 'Questions dynamically chosen for maximum information gain using Bayesian reasoning.' },
              { icon: Target, title: 'Root Cause Discovery', desc: 'Trace any gap to its fundamental missing prerequisite with 90%+ confidence.' },
              { icon: GitBranch, title: 'Learning Roadmaps', desc: 'Daily plans, weekly goals, projects, videos, books, and practice problems.' },
              { icon: Shield, title: 'AI Proctoring', desc: 'Webcam, screen recording, tab detection, face detection, and browser lock.' },
              { icon: BarChart3, title: 'Skill Analytics', desc: 'Skill radar, knowledge score, improvement trends, and hiring recommendations.' },
              { icon: Trophy, title: 'Verified Badges', desc: 'Public skill profiles with verified scores that recruiters can search and trust.' },
              { icon: Zap, title: 'Real-time Feedback', desc: 'Confidence scoring updates with every answer, showing exactly where you stand.' },
              { icon: BookOpen, title: 'Bloom\'s Taxonomy', desc: 'Questions span remember, understand, apply, analyze, evaluate, and create levels.' },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="group rounded-xl border bg-card p-6 hover:shadow-lg transition-all">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge variant="outline" className="mb-4">Who It's For</Badge>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-balance">
              Built for everyone in the learning-to-hiring journey
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[
              { label: 'Students', icon: BookOpen, desc: 'Find gaps before exams' },
              { label: 'Freshers', icon: Sparkles, desc: 'Verify skills for first jobs' },
              { label: 'Professionals', icon: TrendingUp, desc: 'Upskill with precision' },
              { label: 'Self-taught', icon: Brain, desc: 'Validate your knowledge' },
              { label: 'Recruiters', icon: Users, desc: 'Hire by ability, not degrees' },
              { label: 'Universities', icon: Shield, desc: 'Measure real understanding' },
              { label: 'Trainers', icon: Target, desc: 'Track learner progress' },
              { label: 'Companies', icon: BarChart3, desc: 'Build skill inventories' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="group rounded-xl border bg-card p-5 text-center hover:border-primary/50 transition-all">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mx-auto mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">{item.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-muted/30 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-balance">
              Stop guessing. Start knowing.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground text-balance">
              Find your knowledge gaps, verify your skills, and get hired for what you can actually do.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="h-12 px-8 text-base shadow-glow">
                <Link href="/auth/sign-up">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
                <Link href="/auth/sign-in">
                  I already have an account
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Brain className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold">
                SkillSynk<span className="text-primary"> AI</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Find Knowledge Gaps. Verify Skills. Hire by Ability.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
