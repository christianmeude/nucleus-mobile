import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_SUPABASE_URL } from '../config/env';

/** False when the build shipped without backend env (EAS env missing). */
export const isSupabaseConfigured = Boolean(
  EXPO_PUBLIC_SUPABASE_URL && EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

if (__DEV__ && !isSupabaseConfigured) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is missing. ' +
      'Set them in .env. Express auth and API are unchanged until later phases.'
  );
}

let cached: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    // Throw at call time (catchable by callers), never at import time:
    // a misconfigured build must still launch so the user sees UI, not a
    // native "keeps stopping" crash before first paint.
    throw new Error(
      '[supabase] Backend is not configured. Set EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY (EAS environment for release builds).'
    );
  }
  if (!cached) {
    cached = createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return cached;
}

/**
 * Supabase client for Phase 2+ migration. Lazily initialized on first use so
 * importing this module can never crash app startup (regression: preview
 * builds shipped without EAS env vars threw `supabaseUrl is required` at
 * module scope and died before first paint).
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
