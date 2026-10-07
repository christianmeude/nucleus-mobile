import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { fetchAppUserProfile } from '../auth/fetchAppUserProfile';
import { mapSupabaseAuthError } from '../auth/mapSupabaseAuthError';
import { supabase } from '../lib/supabase';
import { clearAuthTokens } from '../storage/authStorage';
import { User } from '../types/domain';
import { apiCache } from '../utils/apiCache';
import { withTimeout } from '../utils/withTimeout';

interface SignInResult {
  success: boolean;
  error?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Upper bound for the whole startup auth sequence (stored-session read +
 * profile lookup). Without this a stalled socket leaves `loading` true
 * forever and the app sits on the loader — seen on-device after a kill
 * mid-auth. Exceeding it fails closed to the logged-out state.
 */
export const AUTH_BOOTSTRAP_TIMEOUT_MS = 20000;

async function loadProfileFromSession(session: Session | null): Promise<User | null> {
  if (!session?.user) {
    return null;
  }

  const { user } = await fetchAppUserProfile(session.user);

  if (user) {
    return user;
  }

  await supabase.auth.signOut();
  return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // The API cache is scoped to the signed-in user; every identity change (sign-in,
  // sign-out, account switch) must re-scope it so one account's data can never be
  // served to another. Applied before setUser so consumers never read stale data.
  const applyUser = (nextUser: User | null) => {
    apiCache.setUserScope(nextUser?.id ?? 'anon');
    setUser(nextUser);
  };

  useEffect(() => {
    let cancelled = false;

    const finishApply = async (session: Session | null) => {
      const nextUser = await loadProfileFromSession(session);
      if (cancelled) return;
      applyUser(nextUser);
    };

    const bootstrap = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await withTimeout(finishApply(session), AUTH_BOOTSTRAP_TIMEOUT_MS, 'Session bootstrap');
      } catch (error) {
        // Backend unreachable or unconfigured (e.g. release built without
        // EAS env vars): land on the logged-out state instead of crashing.
        console.warn('[auth] Session bootstrap failed:', error);
        if (!cancelled) applyUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrap();

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      ({ data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        return;
      }
      if (event === 'INITIAL_SESSION') {
        return;
      }

      if (!session) {
        if (!cancelled) applyUser(null);
        return;
      }

      try {
        // Bounded for the same reason as bootstrap: a stall here must not
        // wedge the session. Unlike bootstrap, a timeout keeps the current
        // user rather than logging out — the stall is likely transient.
        await withTimeout(finishApply(session), AUTH_BOOTSTRAP_TIMEOUT_MS, 'Session refresh');
      } catch (error) {
        console.warn('[auth] Session refresh failed, keeping current user:', error);
      }
    }));
    } catch (error) {
      console.warn('[auth] Auth state subscription failed:', error);
    }

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        return {
          success: false,
          error: mapSupabaseAuthError(error),
        };
      }

      if (!data.session?.user) {
        return {
          success: false,
          error: 'Unable to establish session. Please try again.',
        };
      }

      try {
        const profileResult = await fetchAppUserProfile(data.session.user);
        console.log('[AuthContext.signIn] Profile result:', profileResult);
        
        const profile = profileResult.user;
        if (!profile) {
          await supabase.auth.signOut();
          const errorMsg = profileResult.message || 'Unable to load your profile. Verify your account is provisioned in the system.';
          console.error('[AuthContext.signIn] Profile load failed:', errorMsg);
          return {
            success: false,
            error: errorMsg,
          };
        }
        applyUser(profile);
        return { success: true };
      } catch (profileError) {
        await supabase.auth.signOut();
        const message = profileError instanceof Error ? profileError.message : 'Unable to complete sign in.';
        console.error('[AuthContext.signIn] Caught profile error:', message);
        return {
          success: false,
          error: message,
        };
      }
    } catch (_error) {
      return {
        success: false,
        error: 'Unable to sign in.',
      };
    }
  };

  const signOut = async () => {
    await clearAuthTokens();
    await supabase.auth.signOut();
    applyUser(null);
  };

  const refreshCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const profile = await loadProfileFromSession(session);
      applyUser(profile);
    } catch (_error) {
      await supabase.auth.signOut();
      applyUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOut,
      refreshCurrentUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
