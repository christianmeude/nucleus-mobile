/**
 * Disk persistence for list snapshots (Phase 4, ADR 0007).
 *
 * The contract these tests pin:
 *
 * - Only callers that pass `persist: true` touch disk.
 * - A cold process (fresh `ApiCache`) that hydrates the current scope serves
 *   the snapshot immediately and revalidates in the background. Disk is never
 *   trusted fresh, so the fetcher still runs.
 * - Hydration is scoped: one account can never read another's snapshots.
 * - `setUserScope` drops the *previous* scope's keys, which is what makes the
 *   cold-start path work (the process starts as `anon`, then hydrates the
 *   profile-resolved scope).
 * - Entries older than `MAX_DISK_AGE_MS`, corrupt, wrongly shaped, or
 *   oversized are deleted, never thrown.
 * - `invalidate()`/`clear()` mirror to disk so a mutation cannot leave a
 *   pre-mutation snapshot to be replayed on the next cold start.
 * - An in-flight fetch that outlives an account switch is neither cached nor
 *   persisted for the new account.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiCache, apiCache } from '../apiCache';
import {
  MAX_DISK_AGE_MS,
  MAX_SNAPSHOT_CHARS,
  readScopeSnapshots,
  snapshotStorageKey,
  writeScopeSnapshot,
} from '../apiCacheStorage';

const SCOPE = 'user-christian';
const OTHER_SCOPE = 'user-malfoy';

/** Disk writes are deferred to a macrotask; let them land. */
const settle = (ms = 5) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const storedKeys = async () => [...(await AsyncStorage.getAllKeys())].sort();

const storedEnvelope = async (scope: string, key: string) => {
  const raw = await AsyncStorage.getItem(snapshotStorageKey(scope, key));
  return raw ? JSON.parse(raw) : null;
};

beforeEach(async () => {
  // Let any disk work from the previous test settle before wiping the store,
  // then reset the singleton so each test starts from a cold memory cache.
  await settle(0);
  await AsyncStorage.clear();
  apiCache.clear();
  apiCache.setUserScope('anon');
  await settle(0);
});

describe('ApiCache disk persistence', () => {
  it('writes a snapshot for a persisted fetch and serves it from a cold cache', async () => {
    const fetcher = jest.fn<() => Promise<string[]>>().mockResolvedValue(['row-a']);

    await apiCache.fetchWithSWR('research:myPapers', fetcher, { persist: true });
    await settle();

    expect(await storedKeys()).toEqual([snapshotStorageKey('anon', 'research:myPapers')]);

    // Cold process: fresh instance, nothing in memory.
    const cold = new ApiCache();
    await cold.hydrateFromDisk('anon');

    const network = jest.fn<() => Promise<string[]>>().mockResolvedValue(['row-b']);
    const served = await cold.fetchWithSWR('research:myPapers', network);

    // Snapshot first, revalidation behind it.
    expect(served).toEqual(['row-a']);
    expect(network).toHaveBeenCalledTimes(1);

    await settle();
    expect(await cold.fetchWithSWR('research:myPapers', network, { ttl: 60_000 })).toEqual([
      'row-b',
    ]);
  });

  it('never touches disk when persist is not set', async () => {
    const fetcher = jest.fn<() => Promise<string[]>>().mockResolvedValue(['row-a']);

    await apiCache.fetchWithSWR('research:myPapers', fetcher);
    await settle();

    expect(await storedKeys()).toEqual([]);
  });

  it('refreshes the snapshot after a background revalidation', async () => {
    await writeScopeSnapshot('anon', 'research:myPapers', ['disk-old']);

    const cold = new ApiCache();
    await cold.hydrateFromDisk('anon');

    const network = jest.fn<() => Promise<string[]>>().mockResolvedValue(['fresh']);
    expect(await cold.fetchWithSWR('research:myPapers', network, { persist: true })).toEqual([
      'disk-old',
    ]);

    await settle();
    expect((await storedEnvelope('anon', 'research:myPapers'))?.data).toEqual(['fresh']);
  });

  it('drops snapshots older than MAX_DISK_AGE_MS at hydration', async () => {
    await AsyncStorage.setItem(
      snapshotStorageKey('anon', 'research:myPapers'),
      JSON.stringify({
        data: ['expired'],
        timestamp: Date.now() - MAX_DISK_AGE_MS - 1_000,
      }),
    );

    const cold = new ApiCache();
    await cold.hydrateFromDisk('anon');

    expect(await storedKeys()).toEqual([]);
    const fetcher = jest.fn<() => Promise<string[]>>().mockResolvedValue(['fresh']);
    expect(await cold.fetchWithSWR('research:myPapers', fetcher)).toEqual(['fresh']);
  });

  it('deletes corrupt and wrongly shaped snapshots instead of throwing', async () => {
    await AsyncStorage.setItem(snapshotStorageKey('anon', 'bad-json'), '{not json');
    await AsyncStorage.setItem(
      snapshotStorageKey('anon', 'no-timestamp'),
      JSON.stringify({ data: ['x'] }),
    );

    const cold = new ApiCache();
    await expect(cold.hydrateFromDisk('anon')).resolves.toBeUndefined();

    expect(await storedKeys()).toEqual([]);
  });

  it('deletes oversized snapshots rather than writing them', async () => {
    const oversized = 'x'.repeat(MAX_SNAPSHOT_CHARS);

    expect(await writeScopeSnapshot('anon', 'big', oversized)).toBe(false);
    expect(await storedKeys()).toEqual([]);

    // An existing snapshot for the same key is removed too: keeping a smaller
    // stale body would be worse than having none.
    await writeScopeSnapshot('anon', 'big', 'small');
    expect(await writeScopeSnapshot('anon', 'big', oversized)).toBe(false);
    expect(await storedKeys()).toEqual([]);
  });

  it('round-trips keys that contain colons and JSON', async () => {
    const key = 'research:published:{"category":"cs"}';
    await writeScopeSnapshot('anon', key, [{ id: 'paper-1' }]);

    const [snapshot] = await readScopeSnapshots('anon');

    expect(snapshot.key).toBe(key);
    expect(snapshot.data).toEqual([{ id: 'paper-1' }]);
  });

  it('never hydrates another scope\'s snapshots', async () => {
    await writeScopeSnapshot(OTHER_SCOPE, 'research:myPapers', ['other-account']);

    const cold = new ApiCache();
    await cold.hydrateFromDisk('anon');

    const fetcher = jest.fn<() => Promise<string[]>>().mockResolvedValue(['mine']);
    expect(await cold.fetchWithSWR('research:myPapers', fetcher)).toEqual(['mine']);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('drops the previous scope\'s keys on a switch but keeps the new scope\'s', async () => {
    await writeScopeSnapshot('anon', 'research:categories', ['anon-rows']);
    await writeScopeSnapshot(SCOPE, 'research:myPapers', ['mine']);

    const cache = new ApiCache();
    cache.setUserScope(SCOPE);
    await settle();

    expect(await storedKeys()).toEqual([snapshotStorageKey(SCOPE, 'research:myPapers')]);

    // The cold-start path, in order: scope switches anon -> user, then hydrate.
    await cache.hydrateFromDisk(SCOPE);
    const fetcher = jest.fn<() => Promise<string[]>>().mockResolvedValue(['fresh']);
    expect(await cache.fetchWithSWR('research:myPapers', fetcher)).toEqual(['mine']);
  });

  it('mirrors invalidate() and clear() to disk', async () => {
    await writeScopeSnapshot('anon', 'research:myPapers', ['a']);
    await writeScopeSnapshot('anon', 'submit:departments', ['d']);

    apiCache.invalidate('research:');
    await settle();

    expect(await storedKeys()).toEqual([snapshotStorageKey('anon', 'submit:departments')]);

    apiCache.clear();
    await settle();

    expect(await storedKeys()).toEqual([]);
  });

  it('does not clobber live memory data during hydration', async () => {
    await writeScopeSnapshot('anon', 'research:myPapers', ['disk']);

    const cache = new ApiCache();
    const fetcher = jest.fn<() => Promise<string[]>>().mockResolvedValue(['fresh']);
    await cache.fetchWithSWR('research:myPapers', fetcher);

    await cache.hydrateFromDisk('anon');

    expect(
      await cache.fetchWithSWR('research:myPapers', fetcher, { ttl: 60_000 }),
    ).toEqual(['fresh']);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not cache or persist an in-flight fetch that outlives a scope switch', async () => {
    let resolveFetch!: (value: string[]) => void;
    const fetcher = jest.fn<() => Promise<string[]>>(
      () => new Promise((resolve) => (resolveFetch = resolve)),
    );

    const cache = new ApiCache();
    const pending = cache.fetchWithSWR('research:myPapers', fetcher, { persist: true });

    cache.setUserScope(OTHER_SCOPE);
    resolveFetch(['previous-account-rows']);
    await pending;
    await settle();

    expect(await storedKeys()).toEqual([]);

    const otherFetch = jest.fn<() => Promise<string[]>>().mockResolvedValue(['other']);
    expect(await cache.fetchWithSWR('research:myPapers', otherFetch)).toEqual(['other']);
  });
});
