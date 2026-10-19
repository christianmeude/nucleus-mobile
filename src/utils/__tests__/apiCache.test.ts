/**
 * `apiCache` had no direct coverage, which let a scoping bug ship: the SWR
 * path passed an already-scoped key into the private fetch helpers, which
 * scoped again on write — so entries landed under `scope:scope:key` and
 * `fetchWithSWR` never found its own data. Every "warm" list load was a full
 * network round trip until that was caught in the list-loading perf session.
 *
 * These tests pin the round-trip contract: a second `fetchWithSWR` for the
 * same key inside the TTL must not call the fetcher again.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { apiCache } from '../apiCache';

beforeEach(() => {
  apiCache.clear();
  apiCache.setUserScope('anon');
});

describe('apiCache.fetchWithSWR', () => {
  it('serves a second call from cache without invoking the fetcher again', async () => {
    const fetcher = jest.fn<() => Promise<string[]>>().mockResolvedValue(['a']);

    const first = await apiCache.fetchWithSWR('k', fetcher);
    const second = await apiCache.fetchWithSWR('k', fetcher);

    expect(first).toEqual(['a']);
    expect(second).toEqual(['a']);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent calls for the same key into one fetch', async () => {
    let resolveFetch!: (value: string[]) => void;
    const fetcher = jest.fn<() => Promise<string[]>>(
      () => new Promise((resolve) => (resolveFetch = resolve)),
    );

    const inFlight = Promise.all([
      apiCache.fetchWithSWR('k', fetcher),
      apiCache.fetchWithSWR('k', fetcher),
    ]);

    resolveFetch(['a']);
    const [a, b] = await inFlight;

    expect(a).toEqual(['a']);
    expect(b).toEqual(['a']);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves stale data immediately once the TTL expires, revalidating in the background', async () => {
    const fetcher = jest
      .fn<() => Promise<string[]>>()
      .mockResolvedValueOnce(['old'])
      .mockResolvedValueOnce(['new']);

    await apiCache.fetchWithSWR('k', fetcher, { ttl: 1 });
    await new Promise((resolve) => setTimeout(resolve, 5));

    // Stale-but-present: the second call returns the old rows immediately
    // rather than awaiting a refetch — that's the whole point of SWR.
    const second = await apiCache.fetchWithSWR('k', fetcher, { ttl: 1 });
    expect(second).toEqual(['old']);

    // ...and it kicked off a background revalidation, so a later read of the
    // same key after that completes sees the fresh data.
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(await apiCache.fetchWithSWR('k', fetcher, { ttl: 1000 })).toEqual(['new']);
  });

  it('bypasses the cache and refetches when forceRefresh is set', async () => {
    const fetcher = jest
      .fn<() => Promise<string[]>>()
      .mockResolvedValueOnce(['old'])
      .mockResolvedValueOnce(['new']);

    await apiCache.fetchWithSWR('k', fetcher);
    const refreshed = await apiCache.fetchWithSWR('k', fetcher, { forceRefresh: true });

    expect(refreshed).toEqual(['new']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('drops the previous scope on a user switch, so one account never reads another', async () => {
    const studentFetch = jest.fn<() => Promise<string[]>>().mockResolvedValue(['student-rows']);
    await apiCache.fetchWithSWR('k', studentFetch);
    expect(await apiCache.fetchWithSWR('k', studentFetch)).toEqual(['student-rows']);
    expect(studentFetch).toHaveBeenCalledTimes(1);

    // Switching scope clears the cache: user-b must not see user-a's rows.
    apiCache.setUserScope('user-b');
    const otherFetch = jest.fn<() => Promise<string[]>>().mockResolvedValue(['other-rows']);
    const asOther = await apiCache.fetchWithSWR('k', otherFetch);
    expect(asOther).toEqual(['other-rows']);
    expect(otherFetch).toHaveBeenCalledTimes(1);

    // Switching back re-fetches for user-a rather than serving user-b's rows.
    apiCache.setUserScope('anon');
    const studentAgain = jest.fn<() => Promise<string[]>>().mockResolvedValue(['student-rows']);
    expect(await apiCache.fetchWithSWR('k', studentAgain)).toEqual(['student-rows']);
    expect(studentAgain).toHaveBeenCalledTimes(1);
  });

  it('does not cache a rejected fetch', async () => {
    const fetcher = jest
      .fn<() => Promise<string[]>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(['recovered']);

    await expect(apiCache.fetchWithSWR('k', fetcher)).rejects.toThrow('boom');
    const second = await apiCache.fetchWithSWR('k', fetcher);

    expect(second).toEqual(['recovered']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
