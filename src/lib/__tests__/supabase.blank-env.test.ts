/**
 * Regression test for the release startup crash:
 * `com.facebook.react.common.JavascriptException: Error: supabaseUrl is required.`
 *
 * The preview build compiled with blank EXPO_PUBLIC_* env vars, and
 * `lib/supabase` called `createClient('', '')` at module scope, killing the
 * app before first paint. Importing this module must never throw, even with
 * a blank backend — failure must surface at call time with a clear message.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../config/env', () => ({
  EXPO_PUBLIC_SUPABASE_URL: '',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
}));

describe('lib/supabase with blank backend env', () => {
  it('does not throw at import time', () => {
    expect(() => require('../supabase')).not.toThrow();
  });

  it('reports itself as unconfigured', () => {
    const { isSupabaseConfigured } = require('../supabase');
    expect(isSupabaseConfigured).toBe(false);
  });

  it('throws a descriptive error on use, not a library invariant', () => {
    const { supabase } = require('../supabase');
    expect(() => supabase.auth).toThrow(/not configured/);
  });
});
