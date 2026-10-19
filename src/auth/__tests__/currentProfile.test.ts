/**
 * Locks in the identity-resolution contract added in `src/auth/currentProfile.ts`.
 *
 * The bug these guard: every API facade resolved identity itself with
 * `auth.getUser()` (network) + `fetchAppUserProfile()` (network) on *every* call.
 * On-device logs showed 706 such lookups in one session, ~34 per active minute.
 *
 * `src/lib/supabase.ts` is frozen, so it is mocked here; `fetchAppUserProfile`
 * runs for real against the faked client, as in the api facade tests.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../lib/supabase', () => {
  const { createSupabaseClientMock } = require('../../api/__tests__/supabaseTestUtils');
  return { supabase: createSupabaseClientMock() };
});

import { supabase } from '../../lib/supabase';
import {
  clearCurrentProfileCache,
  PROFILE_CACHE_TTL_MS,
  resolveCurrentFacultyProfile,
  resolveCurrentProfile,
  resolveCurrentStudentProfile,
} from '../currentProfile';
import { createQueryBuilder, queryResult, queueProfileLookup } from '../../api/__tests__/supabaseTestUtils';
import type { MockSupabaseClient } from '../../api/__tests__/supabaseTestUtils';

const mockSupabase = supabase as unknown as MockSupabaseClient;

beforeEach(() => {
  jest.resetAllMocks();
  clearCurrentProfileCache();
  mockSupabase.from.mockImplementation(() => createQueryBuilder(queryResult()));
});

const SURFACE = { label: 'test data' } as const;

describe('resolveCurrentProfile', () => {
  it('resolves the profile from the session without any network auth call', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });

    const user = await resolveCurrentProfile(SURFACE);

    expect(user.id).toBe('student-1');
    // getSession() reads local storage; getUser() was the network round trip we removed.
    expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);
  });

  it('serves repeat lookups from the memo — one users query for many calls', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockClear();

    await resolveCurrentProfile(SURFACE);
    await resolveCurrentProfile(SURFACE);
    await resolveCurrentProfile(SURFACE);

    // The queued `users` lookup is consumed exactly once; the memo covers the rest.
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent lookups for the same session into one query', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });

    const [a, b, c] = await Promise.all([
      resolveCurrentProfile(SURFACE),
      resolveCurrentProfile(SURFACE),
      resolveCurrentProfile(SURFACE),
    ]);

    expect([a.id, b.id, c.id]).toEqual(['student-1', 'student-1', 'student-1']);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1); // just the users row
  });

  it('re-resolves once the memo is cleared, as on an identity change', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    await resolveCurrentProfile(SURFACE);

    clearCurrentProfileCache();

    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-2' } });
    await expect(resolveCurrentProfile(SURFACE)).resolves.toMatchObject({ id: 'student-2' });
  });

  it('re-resolves once the TTL has elapsed', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    await resolveCurrentProfile(SURFACE);

    const started = Date.now();
    const spy = jest.spyOn(Date, 'now').mockReturnValue(started + PROFILE_CACHE_TTL_MS + 1);
    try {
      queueProfileLookup(mockSupabase, { profileRow: { id: 'student-3' } });
      await expect(resolveCurrentProfile(SURFACE)).resolves.toMatchObject({ id: 'student-3' });
    } finally {
      spy.mockRestore();
    }
  });

  it('does not serve one account the previous account\u2019s profile', async () => {
    queueProfileLookup(mockSupabase, {
      authUser: { id: 'auth-a', email: 'a@nu-dasma.edu.ph' },
      profileRow: { id: 'user-a', email: 'a@nu-dasma.edu.ph' },
    });
    await expect(resolveCurrentProfile(SURFACE)).resolves.toMatchObject({ id: 'user-a' });

    // Same instance, new session (no explicit cache clear) — the key must miss.
    queueProfileLookup(mockSupabase, {
      authUser: { id: 'auth-b', email: 'b@nu-dasma.edu.ph' },
      profileRow: { id: 'user-b', email: 'b@nu-dasma.edu.ph' },
    });
    await expect(resolveCurrentProfile(SURFACE)).resolves.toMatchObject({ id: 'user-b' });
  });

  it('reports the identity-specific reason when the account is not provisioned', async () => {
    queueProfileLookup(mockSupabase, { profileRow: null });

    await expect(resolveCurrentProfile(SURFACE)).rejects.toThrow(/not been provisioned/i);
  });

  it('does not memoize a failed lookup', async () => {
    queueProfileLookup(mockSupabase, { profileRow: null });
    await expect(resolveCurrentProfile(SURFACE)).rejects.toThrow();

    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    await expect(resolveCurrentProfile(SURFACE)).resolves.toMatchObject({ id: 'student-1' });
  });

  it('throws a surface-specific message when there is no session', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });

    await expect(resolveCurrentProfile({ label: 'research data' })).rejects.toThrow(
      'Sign in required to load research data.',
    );
  });
});

describe('role-scoped resolvers', () => {
  it('rejects a student resolving faculty profile', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { role: 'student' } });

    await expect(
      resolveCurrentFacultyProfile({ label: 'faculty data', roleNoun: 'assigned papers' }),
    ).rejects.toThrow('Faculty access is required to load assigned papers.');
  });

  it('rejects a faculty member resolving the student profile', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { role: 'faculty' } });

    await expect(resolveCurrentStudentProfile({ label: 'invitations' })).rejects.toThrow(
      'Student access is required to load invitations.',
    );
  });

  it('shares one memo across the role-scoped resolvers', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { role: 'student' } });

    await resolveCurrentStudentProfile({ label: 'invitations' });
    await resolveCurrentProfile({ label: 'research data' });

    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });
});
