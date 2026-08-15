'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type Profile } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: 'not initialized' }),
  signUp: async () => ({ error: 'not initialized' }),
  signInWithGoogle: async () => ({ error: 'not initialized' }),
  resetPassword: async () => ({ error: 'not initialized' }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('Error loading profile:', error.message);
      return;
    }
    if (data) {
      setProfile(data as Profile);
    }
  }, []);

  const ensureProfile = useCallback(async (user: User) => {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existing) {
      const fullName = (user.user_metadata?.full_name as string) ?? '';
      const role = (user.user_metadata?.role as string) ?? 'student';
      const email = user.email ?? '';

      const { error: insertError } = await supabase.from('profiles').insert({
        id: user.id,
        email,
        full_name: fullName,
        role,
      });

      if (insertError) {
        console.error('Error creating profile:', insertError.message);
      }
    }
    await loadProfile(user.id);
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;

    // Get initial session — this is synchronous from localStorage, so it's fast
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        ensureProfile(session.user).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes (token refresh, sign in/out, OAuth callback)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      (async () => {
        if (!mounted) return;
        setSession(newSession);
        if (newSession?.user) {
          await ensureProfile(newSession.user);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [ensureProfile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      await ensureProfile(data.user);
    }
    return { error: null };
  }, [ensureProfile]);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, role: string = 'student') => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } },
      });
      if (error) return { error: error.message };

      // If session is established immediately (email confirmation off), create profile
      if (data.session?.user) {
        await ensureProfile(data.session.user);
        return { error: null };
      }

      // If no session yet, try signing in immediately (some Supabase configs require this)
      if (data.user && !data.session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          // Account was created but we couldn't auto-login — user should sign in manually
          return { error: null };
        }
        if (signInData.user) {
          await ensureProfile(signInData.user);
        }
      }
      return { error: null };
    },
    [ensureProfile],
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : undefined,
        },
      });
      if (error) {
        return { error: 'Google authentication is not configured. Please use email and password.' };
      }
      // OAuth redirect will trigger onAuthStateChange — no need to do anything else
      return { error: null };
    } catch {
      return { error: 'Google authentication is not configured. Please use email and password.' };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin + '/auth/reset-password' : undefined,
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, loading, signIn, signUp, signInWithGoogle, resetPassword, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
