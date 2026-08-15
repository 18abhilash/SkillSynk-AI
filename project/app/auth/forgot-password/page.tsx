'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Brain, ArrowLeft, Loader2, MailCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    const { error } = await resetPassword(email);
    if (error) {
      setErrorMsg(error);
      toast.error(error);
      setLoading(false);
    } else {
      setSent(true);
      toast.success('Password reset link sent to your email');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />

      <Card className="relative w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Brain className="h-6 w-6" />
            </div>
          </Link>
          <CardTitle className="text-2xl font-display">Forgot Password</CardTitle>
          <CardDescription>
            {sent ? 'Check your email for a reset link' : "Enter your email and we'll send you a reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 mx-auto">
                <MailCheck className="h-8 w-8 text-success" />
              </div>
              <p className="text-sm text-muted-foreground">
                We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>. Check your inbox and follow the link to reset your password.
              </p>
              <p className="text-xs text-muted-foreground">
                The link will expire in 1 hour. If you don't see it, check your spam folder.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link href="/auth/sign-in">Back to Sign In</Link>
              </Button>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 mb-4">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{errorMsg}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
                </Button>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Remember your password?{' '}
                  <Link href="/auth/sign-in" className="text-primary font-medium hover:underline">
                    Sign in
                  </Link>
                </div>
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
