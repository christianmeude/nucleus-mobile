/**
 * Memoized resolution of the signed-in user's application profile.
 *
 * Every API facade used to resolve identity itself, and each resolution cost
 * **two network round trips** on **every** call:
 *
 *   1. `supabase.auth.getUser()` — a network request to `/auth/v1/user`
 *   2. `fetchAppUserProfile()` — a second network query on `public.users`
 *
 * On-device logs measured the cost: 706 profile lookups in a single session,
 * peaking at 19 within five seconds (~34 per active minute), at a median 460ms
 * and a p90 of 1.1s each. Opening one paper triggered 3-8 of them.
 *
 * Two changes remove that:
 *
 *  1. **Read the identity from `getSession()` instead of `getUser()`.** The
 *     session is already in local storage, so this costs no network. Per
 *     `docs/adr/0003-auth-identity-resolution.md` the real authorization
 *     boundary is email-based RLS evaluated *server-side* against the signed
 *     JWT that Supabase attaches to every request — `getUser()` was a redundant
 *     client-side echo of a check the server already performs on the same call.
 *  2. **Memoize the resolved profile** in memory, keyed by the session's user
 *     id + email, with a TTL. The `public.users` row changes very rarely, so
 *     re-querying it per API call bought nothing.
 *
 * ## Staleness
 *
 * A cached profile is reused for at most `PROFILE_CACHE_TTL_MS` and is dropped
 * outright on any identity change (`clearCurrentProfileCache()`, called by
 * `AuthContext`). A server-side role change or suspension therefore takes effect
 * within the TTL rather than instantly — acceptable because the client-side role
 * gate is a UX affordance, never the security boundary (RLS is). Failed
 * resolutions are never cached.
 *
 * ## Not a cache of *data*
 *
 * This only memoizes identity. Query results keep flowing through
 * `utils/apiCache` (SWR/LRU), which already re-scopes on account switch.
 */
import { supabase } from '../lib/supabase';
import type { User } from '../types/domain';
import { fetchAppUserProfile } from './fetchAppUserProfile';

/** How long a resolved profile is trusted before it is looked up again. */
export const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

/** Names the wording of the thrown errors, so each surface keeps its own copy. */
interface ProfileSurface {
  /**
   * Noun phrase for "Sign in required to load {label}." and the
   * not-provisioned fallback. Keep it lowercase and sentence-medial.
   */
  label: string;
  /**
   * Overrides the noun in the role-rejection message for surfaces that name
   * something more specific than `label` (e.g. "assigned papers").
   */
  roleNoun?: string;
}

interface CachedProfile {
  key: string;
  user: User;
  resolvedAt: number;
}

/** Outcome of a profile lookup: the row, or the reason there isn't one. */
interface ProfileLookup {
  user: User | null;
  /** Populated only when `user` is null — the user-facing reason from `fetchAppUserProfile`. */
  message?: string;
}

let cached: CachedProfile | null = null;
let inFlight: { key: string; promise: Promise<ProfileLookup> } | null = null;

/**
 * Drops the memoized profile and any in-flight lookup. Call on every identity
 * change (sign-in, sign-out, account switch) so one account's profile can never
 * be served to another.
 */
export function clearCurrentProfileCache(): void {
  cached = null;
  inFlight = null;
}

/**
 * Seeds the memo with a profile the caller already resolved (auth bootstrap,
 * sign-in). Without this, `applyUser` clears the memo and the first list read
 * immediately re-queries `public.users` by email — a serial round trip in front
 * of the dashboard's revalidation.
 *
 * `authUser` must be the Supabase session user: the memo key is built from the
 * auth id, which is not necessarily `public.users.id`.
 */
export function seedCurrentProfile(
  authUser: { id: string; email?: string | null },
  user: User,
): void {
  cached = { key: cacheKeyFor(authUser), user, resolvedAt: Date.now() };
}

/** Stable cache key for an auth user: id plus normalized email. */
function cacheKeyFor(authUser: { id: string; email?: string | null }): string {
  return `${authUser.id}:${(authUser.email ?? '').trim().toLowerCase()}`;
}

/**
 * Resolves the `public.users` profile for the current session, memoized.
 * Returns a null `user` (with the user-facing `message`) when the session exists
 * but has no usable profile row (not provisioned / suspended) — the caller
 * decides how to phrase that. Throws when there is no usable session at all.
 */
async function loadProfile(label: string): Promise<ProfileLookup> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || 'Unable to resolve the current session.');
  }

  const authUser = data.session?.user;

  if (!authUser) {
    throw new Error(`Sign in required to load ${label}.`);
  }

  const key = cacheKeyFor(authUser);

  if (cached && cached.key === key && Date.now() - cached.resolvedAt <= PROFILE_CACHE_TTL_MS) {
    return { user: cached.user };
  }

  // Deduplicate concurrent resolutions for the same session: the paper-detail
  // screen fires several of these in parallel, and each used to hit the network.
  if (inFlight && inFlight.key === key) {
    return inFlight.promise;
  }

  const promise = fetchAppUserProfile(authUser)
    .then((result) => {
      if (result.user) {
        cached = { key, user: result.user, resolvedAt: Date.now() };
        return { user: result.user };
      }
      // Never memoize a failure — a transient query error must not pin the user
      // to the not-provisioned state for the whole TTL.
      if (cached?.key === key) cached = null;
      return { user: null, message: result.message };
    })
    .finally(() => {
      if (inFlight?.key === key) inFlight = null;
    });

  inFlight = { key, promise };

  return promise;
}

async function requireProfile(surface: ProfileSurface): Promise<User> {
  const { user, message } = await loadProfile(surface.label);

  if (!user) {
    throw new Error(message || `Your account is not provisioned for ${surface.label}.`);
  }

  return user;
}

async function requireRole(
  role: User['role'],
  surface: ProfileSurface,
  roleLabel: 'Student' | 'Faculty',
): Promise<User> {
  const user = await requireProfile(surface);

  if (user.role !== role) {
    const noun = surface.roleNoun ?? surface.label;
    throw new Error(`${roleLabel} access is required to load ${noun}.`);
  }

  return user;
}

/**
 * The current authenticated profile, regardless of role. Use for shared read
 * paths (e.g. the published repository, which students and faculty both browse —
 * RLS already grants published rows to any authenticated caller).
 */
export const resolveCurrentProfile = (surface: ProfileSurface): Promise<User> =>
  requireProfile(surface);

export const resolveCurrentStudentProfile = (surface: ProfileSurface): Promise<User> =>
  requireRole('student', surface, 'Student');

export const resolveCurrentFacultyProfile = (surface: ProfileSurface): Promise<User> =>
  requireRole('faculty', surface, 'Faculty');
