/**
 * Loads `public.users` for the signed-in Supabase Auth user by email.
 * The application profile row must exist; no fallback profile generation is supported.
 * This ensures strict provisioning requirements and alignment with the web backend.
 */
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types/domain';
import { TimeoutError, withTimeout } from '../utils/withTimeout';

/** Upper bound for the profile lookup. Exceeded on a stalled socket (no
 *  resolution at all), in which case the caller must fail closed to the
 *  logged-out state instead of spinning the app loader forever. */
export const PROFILE_QUERY_TIMEOUT_MS = 15000;

export type FetchAppUserProfileError = 'not_provisioned' | 'suspended' | 'query_failed' | 'rls_blocked';

type SupabaseAuthUserSnapshot = {
  id: string;
  email?: string | null;
  created_at?: string;
  user_metadata?: Record<string, unknown> | null;
};

export interface FetchAppUserProfileResult {
  user: User | null;
  error?: FetchAppUserProfileError;
  message?: string;
}

function buildFullName(row: {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}): string {
  const parts = [row.first_name, row.middle_name, row.last_name].filter(Boolean) as string[];
  const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
  return joined || String(row.email || '').trim();
}

export async function fetchAppUserProfile(
  authUser: SupabaseAuthUserSnapshot,
  timeoutMs: number = PROFILE_QUERY_TIMEOUT_MS,
): Promise<FetchAppUserProfileResult> {
  const authEmail = authUser.email?.trim().toLowerCase();

  if (!authEmail) {
    console.warn('[fetchAppUserProfile] No email provided for profile lookup');
    return {
      user: null,
      error: 'query_failed',
      message: 'No email provided for profile lookup',
    };
  }

  const selectColumns =
    'id, email, first_name, middle_name, last_name, role, department, department_id, program, program_id, created_at, is_active, suspended_at';

  const normalized = authEmail;
  console.log(`[fetchAppUserProfile] Looking up user by email: ${normalized}`);

  try {
    const query = supabase
      .from('users')
      .select(selectColumns)
      .ilike('email', normalized)
      .maybeSingle();

    // The query builder is thenable, not a real promise — assimilate it so
    // Promise.race can bound it. A stalled socket never settles, so without
    // this the app loader spins forever (seen on-device after a killed
    // mid-auth restart: "Looking up user" with no follow-up line).
    const { data, error } = await withTimeout(
      Promise.resolve(query),
      timeoutMs,
      'Profile lookup',
    );

    if (error) {
      console.error(`[fetchAppUserProfile] Query error:`, error.code, error.message);
      // Code 42501 = RLS policy violation
      if (error.code === '42501') {
        return {
          user: null,
          error: 'rls_blocked',
          message: 'Profile access blocked by database policy. Contact support if this persists.',
        };
      }
      return {
        user: null,
        error: 'query_failed',
        message: error.message,
      };
    }

    if (!data) {
      console.warn(`[fetchAppUserProfile] No user found with email: ${normalized}. Account is not provisioned in the application database.`);
      return {
        user: null,
        error: 'not_provisioned',
        message: 'Your account has not been provisioned. Please contact your administrator or check that you registered with the correct email address.',
      };
    }

    console.log(`[fetchAppUserProfile] Found user:`, { id: data.id, email: data.email, role: data.role });

    if (data.is_active === false || data.suspended_at) {
      console.warn(`[fetchAppUserProfile] User is suspended`);
      return {
        user: null,
        error: 'suspended',
        message: 'Your account is suspended. Please contact support.',
      };
    }

    const user: User = {
      id: data.id,
      email: data.email,
      fullName: buildFullName(data),
      role: data.role as UserRole,
      department: data.department ?? null,
      departmentId: data.department_id ?? null,
      program: data.program ?? null,
      programId: data.program_id ?? null,
      createdAt: data.created_at ?? undefined,
    };

    console.log(`[fetchAppUserProfile] Profile loaded successfully`);
    return { user };
  } catch (err) {
    console.error(`[fetchAppUserProfile] Caught exception:`, err);
    if (err instanceof TimeoutError) {
      return {
        user: null,
        error: 'query_failed',
        message: 'Profile lookup timed out. Check your connection and try again.',
      };
    }
    return {
      user: null,
      error: 'query_failed',
      message: err instanceof Error ? err.message : 'Failed to load profile',
    };
  }
}
