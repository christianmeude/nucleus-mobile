/**
 * Regression test for the stuck-on-loader hang seen on-device:
 * `fetchAppUserProfile` logged "Looking up user by email" and the Supabase
 * query never settled (stalled socket after a kill mid-auth). Bootstrap
 * awaited it forever, `AuthContext.loading` stayed true, and the app sat on
 * the logo indefinitely. The lookup must time out and fail closed.
 */
import { fetchAppUserProfile } from '../fetchAppUserProfile';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        ilike: () => ({
          // Never settles — simulates the stalled socket from the logcat.
          maybeSingle: () => new Promise(() => {}),
        }),
      }),
    }),
  },
}));

describe('fetchAppUserProfile with a hanging query', () => {
  it('fails closed with query_failed instead of hanging forever', async () => {
    const result = await fetchAppUserProfile(
      { id: 'auth-id', email: 'malfoy@students.com' },
      50,
    );
    expect(result.user).toBeNull();
    expect(result.error).toBe('query_failed');
    expect(result.message).toMatch(/timed out/);
  }, 10000);
});
