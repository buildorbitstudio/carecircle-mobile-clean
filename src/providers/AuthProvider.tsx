import type { Session } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { deactivateCurrentPushToken } from '@/lib/notifications/push-registration';

type SignUpInput = {
  email: string;
  password: string;
  fullName: string;
};

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  onboardingComplete: boolean;
  refreshOnboardingStatus: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function assertConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file, then restart Expo.',
    );
  }
}

async function fetchOnboardingStatus(userId: string) {
  const { data, error } = await supabase
    .from('family_members')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.warn('Unable to restore Supabase session:', error.message);
      }

      setSession(data.session);
      setIsCheckingOnboarding(Boolean(data.session));
      setIsRestoringSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setOnboardingComplete(false);
      setIsCheckingOnboarding(Boolean(nextSession));
      setIsRestoringSession(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    let cancelled = false;
    void fetchOnboardingStatus(userId)
      .then((complete) => {
        if (cancelled) return;
        setOnboardingComplete(complete);
        setIsCheckingOnboarding(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.warn(
          'Unable to check onboarding status:',
          error instanceof Error ? error.message : error,
        );
        setOnboardingComplete(false);
        setIsCheckingOnboarding(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => subscription.remove();
  }, []);

  const refreshOnboardingStatus = async () => {
    if (!session?.user.id) {
      setOnboardingComplete(false);
      return;
    }

    setIsCheckingOnboarding(true);
    try {
      const complete = await fetchOnboardingStatus(session.user.id);
      setOnboardingComplete(complete);
    } finally {
      setIsCheckingOnboarding(false);
    }
  };

  const value: AuthContextValue = {
    session,
    isLoading: isRestoringSession || (Boolean(session) && isCheckingOnboarding),
    onboardingComplete,
    refreshOnboardingStatus,
    signIn: async (email, password) => {
      assertConfigured();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
    },
    signUp: async ({ email, password, fullName }) => {
      assertConfigured();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) throw error;
      return { requiresEmailConfirmation: data.session === null };
    },
    signOut: async () => {
      assertConfigured();
      if (session?.user.id) {
        try {
          await deactivateCurrentPushToken(session.user.id);
        } catch (error) {
          console.warn(
            'Unable to deactivate push token:',
            error instanceof Error ? error.message : error,
          );
        }
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
