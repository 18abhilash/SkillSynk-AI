'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordChecklist } from '@/components/password-checklist';
import { validatePassword } from '@/lib/password-validation';
import { Brain, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // The reset link from the email contains a recovery token in the URL hash.
    // Supabase's detectSessionInUrl: true will automatically exchange it for a session.
    // We need to wait for that session to appear before allowing a password update.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setHasSession(true);
        setVerifying(false);
      } else {
        // The token might still be processing. Listen for the auth state change.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (!mounted) return;
          if (event === 'SIGNED_IN' && newSession) {
            setHasSession(true);
            setVerifying(false);
            subscription.unsubscribe();
          } else if (event === 'PASSWORD_RECOVERY' && newSession) {
            setHasSession(true);
            setVerifying(false);
            subscription.unsubscribe();
          }
        });

        // If no session appears within 5 seconds, show an error
        const timeout = setTimeout(() => {
          if (!mounted) return;
          if (!hasSession) {
            setError('This password reset link is invalid or has expired. Please request a new one.');
            setVerifying(false);
          }
        }, 5000);

        return () => {
          subscription.unsubscribe();
          clearTimeout(timeout);
        };
      }
    });

    return () => { mounted = false; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { valid, failedRules } = validatePassword(password);
    if (!valid) {
      toast.error('Password does not meet all requirements', {
        description: failedRules.map((r) => r.label).join(', '),
      });
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Password updated successfully!');
      // Sign out so the recovery session doesn't linger
      await supabase.auth.signOut();
      router.push('/auth/sign-in');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-success/10 blur-[120px]" />

      <Card className="relative w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Brain className="h-6 w-6" />
            </div>
          </Link>
          <CardTitle className="text-2xl font-display">Reset Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          {verifying ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Link Invalid</p>
                  <p className="text-xs text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href="/auth/forgot-password">Request new reset link</Link>
              </Button>
              <div className="text-center">
                <Link href="/auth/sign-in" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 mb-4">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <p className="text-xs text-success">Reset link verified. Set your new password.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
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
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
                </Button>
              </form>
            </>
          )}
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
