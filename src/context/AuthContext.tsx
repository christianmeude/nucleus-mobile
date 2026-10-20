import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchAppUserProfile } from '../auth/fetchAppUserProfile';
import { clearCurrentProfileCache, seedCurrentProfile } from '../auth/currentProfile';
import { mapSupabaseAuthError } from '../auth/mapSupabaseAuthError';
import { clearSignedUrlCache } from '../utils/signedStorageUrl';
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
  // The memoized identity resolution and signed file URLs are dropped alongside it,
  // for the same reason: neither may outlive the session that authorized it.
  //
  // Disk hydration is awaited here, before `setUser`, so the tab navigator's first
  // mount already has the list snapshots in memory (rows instead of skeletons).
  // The scope is `public.users.id`, so this cannot start before the profile
  // lookup; `hydrateFromDisk` is bounded and non-throwing, so a stuck native
  // store cannot trip the auth-bootstrap timeout below.
  //
  // `signIn` applies the profile twice (its own path plus the auth listener), so
  // disk reads and cache clears are gated on an actual scope change. Re-seeding
  // is not: the just-resolved profile is handed to `currentProfile` so the first
  // list read does not re-query `public.users` by email.
  const appliedScopeRef = useRef<string | null>(null);
  const applyUser = async (
    nextUser: User | null,
    authUser?: { id: string; email?: string | null },
  ) => {
    const scope = nextUser?.id ?? 'anon';
    const scopeChanged = appliedScopeRef.current !== scope;
    appliedScopeRef.current = scope;

    apiCache.setUserScope(scope);

    if (scopeChanged) {
      await apiCache.hydrateFromDisk(scope);
      clearCurrentProfileCache();
      clearSignedUrlCache();
    }

    if (nextUser && authUser) {
      seedCurrentProfile(authUser, nextUser);
    }

    setUser(nextUser);
  };

  useEffect(() => {
    let cancelled = false;

    const finishApply = async (session: Session | null) => {
      const nextUser = await loadProfileFromSession(session);
      if (cancelled) return;
      await applyUser(nextUser, session?.user ?? undefined);
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
        if (!cancelled) await applyUser(null);
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
        if (!cancelled) await applyUser(null);
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
        await applyUser(profile, data.session.user);
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
    } catch (error) {
      // Surface the underlying reason (network failure vs. missing build-time
      // env): the generic message hid which branch failed and cost a full
      // rebuild cycle to diagnose. Thrown messages never include secrets —
      // only the Error text, truncated.
      console.error('[AuthContext.signIn] signInWithPassword threw:', error);
      const detail =
        error instanceof Error
          ? error.message?.trim()
          : typeof error === 'string'
            ? error.trim()
            : '';
      return {
        success: false,
        error: detail ? `Unable to sign in. (${detail.slice(0, 200)})` : 'Unable to sign in.',
      };
    }
  };

  const signOut = async () => {
    await clearAuthTokens();
    await supabase.auth.signOut();
    await applyUser(null);
  };

  const refreshCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const profile = await loadProfileFromSession(session);
      await applyUser(profile, session?.user ?? undefined);
    } catch (_error) {
      await supabase.auth.signOut();
      await applyUser(null);
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
