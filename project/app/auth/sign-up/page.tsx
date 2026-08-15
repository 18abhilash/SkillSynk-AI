'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PasswordChecklist } from '@/components/password-checklist';
import { validatePassword } from '@/lib/password-validation';
import { Brain, ArrowLeft, Loader2, CheckCircle2, MailCheck, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'professional', label: 'Professional' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'company_admin', label: 'Company Admin' },
  { value: 'university', label: 'University' },
  { value: 'trainer', label: 'Trainer' },
];

type SignUpPhase = 'form' | 'otp' | 'success';

export default function SignUpPage() {
  const { signInWithGoogle } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phase, setPhase] = useState<SignUpPhase>('form');
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { valid, failedRules } = validatePassword(password);
    if (!valid) {
      toast.error('Password does not meet all requirements', {
        description: failedRules.map((r) => r.label).join(', '),
      });
      return;
    }

    setLoading(true);

    // Use signUp which creates the account and sends a 6-digit numeric OTP
    // (not a magic link) when email confirmation is enabled
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });

    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already been registered')) {
        toast.error('This email is already registered. Try signing in instead.');
      } else {
        toast.error(error.message);
      }
      return;
    }

    // If a session was returned, email confirmation is OFF — account is created and user is logged in
    if (data.session?.user) {
      setPhase('success');
      setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
      return;
    }

    // No session means email confirmation is ON — Supabase sent a 6-digit code to the user's email
    if (data.user && !data.session) {
      toast.success('Verification code sent! Check your email for a 6-digit code.');
      setPhase('otp');
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.trim().length < 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setOtpLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp.trim(),
      type: 'signup',
    });

    if (verifyError) {
      toast.error(verifyError.message);
      setOtpLoading(false);
      return;
    }

    toast.success('Email verified! Welcome to SkillSphere AI.');
    setPhase('success');
    setOtpLoading(false);
    setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;

    setOtpLoading(true);
    // Re-send the confirmation OTP by calling signUp again
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    setOtpLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('New verification code sent!');
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error('Google sign-in is not available yet. Please use email and password instead.');
      setGoogleLoading(false);
    }
  }

  if (phase === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <Card className="relative w-full max-w-md shadow-xl">
          <CardContent className="text-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Account Created!</h2>
            <p className="text-sm text-muted-foreground mb-4">Your email has been verified. Redirecting to your dashboard...</p>
            <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-accent/10 blur-[120px]" />
        <Card className="relative w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
              <MailCheck className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-display">Verify Your Email</CardTitle>
            <CardDescription>
              We sent a 6-digit verification code to <span className="font-medium text-foreground">{email}</span>. Enter it below to create your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  className="text-center text-2xl tracking-[0.5em] font-bold h-14"
                  inputMode="numeric"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={otpLoading || otp.trim().length < 6}>
                {otpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Create Account'}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || otpLoading}
                  className="text-primary font-medium hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={() => { setPhase('form'); setOtp(''); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Change email
                </button>
              </div>
            </form>
            <div className="mt-4 text-center">
              <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-accent/10 blur-[120px]" />

      <Card className="relative w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Brain className="h-6 w-6" />
            </div>
          </Link>
          <CardTitle className="text-2xl font-display">Create your account</CardTitle>
          <CardDescription>Start finding knowledge gaps and verifying skills</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full mb-4"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span className="ml-2">Continue with Google</span>
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              {password.length > 0 && <PasswordChecklist password={password} />}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">I am a...</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>We&apos;ll send a 6-digit verification code to your email before creating your account.</span>
            </div>
            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Verification Code'}
            </Button>
          </form>
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Free for students and self-taught learners
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              No credit card required
            </div>
          </div>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/sign-in" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </div>
          <div className="mt-4 text-center">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
