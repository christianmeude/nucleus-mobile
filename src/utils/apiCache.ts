/**
 * In-memory Stale-While-Revalidate (SWR) and LRU cache for API queries.
 * Eliminates loading skeletons and latency when navigating between feeds or tabs
 * by returning cached data synchronously/instantly while updating in the background.
 *
 * Opt-in disk persistence (`persist: true`) lets the same rows survive a process
 * death: `hydrateFromDisk` seeds them as stale before the first screen mounts,
 * so they paint instantly and revalidate behind the UI. See ADR 0007.
 */
import { perfMark } from './perfLog';
import {
  HYDRATE_TIMEOUT_MS,
  readScopeSnapshots,
  removeScopeKeys,
  removeScopeSnapshots,
  writeScopeSnapshot,
} from './apiCacheStorage';
import { withTimeout } from './withTimeout';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface SWROptions<T> {
  /** If true, ignores valid cache and forces a fresh network fetch. */
  forceRefresh?: boolean;
  /** Time-to-live in milliseconds before data is considered stale. Default: 5 minutes. */
  ttl?: number;
  /** Callback invoked when a background revalidation completes with fresh data. */
  onUpdate?: (data: T) => void;
  /**
   * Mirrors successful results to AsyncStorage and hydrates them on the next
   * cold start. Only list snapshots intended for instant paint opt in; faculty
   * and per-paper data always revalidate. Default: false.
   */
  persist?: boolean;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

export class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();
  private scope = 'anon';

  /**
   * Re-scopes the cache to a single authenticated user. All entries are stored
   * under a per-scope key prefix so data from one account can never be served
   * to another after a sign-in/sign-out or an account switch. Switching scope
   * drops the previous user's entries — memory, in-flight requests, and disk.
   */
  setUserScope(scope: string): void {
    if (scope === this.scope) return;
    const previousScope = this.scope;
    this.scope = scope;
    this.cache.clear();
    this.inFlight.clear();
    // Previous scope only. The new scope's snapshots are what hydration reads.
    void removeScopeSnapshots(previousScope);
  }

  /**
   * Seeds the cache with this scope's persisted snapshots, marking every entry
   * stale (`timestamp: 0`) so the first read returns it immediately and
   * revalidates behind the UI. Disk is never trusted fresh.
   *
   * Called by `AuthContext` after the profile resolves and awaited before the
   * tab navigator mounts, so list screens never see a cold cache. Bounded and
   * non-throwing: disk I/O must not be able to hold up (or fail) auth.
   */
  async hydrateFromDisk(scope: string = this.scope): Promise<void> {
    const startedAt = Date.now();
    let snapshots: Awaited<ReturnType<typeof readScopeSnapshots>> = [];

    try {
      snapshots = await withTimeout(
        readScopeSnapshots(scope),
        HYDRATE_TIMEOUT_MS,
        'Cache hydration',
      );
    } catch (error) {
      console.warn('[apiCache] Skipped disk hydration:', error);
      return;
    }

    // The account changed while the disk read was in flight; those rows belong
    // to the previous user.
    if (this.scope !== scope) return;

    let seeded = 0;
    for (const snapshot of snapshots) {
      const scoped = this.scopedKey(snapshot.key);
      // A live fetch may have landed first — never replace fresh rows with disk.
      if (this.cache.has(scoped)) continue;
      this.cache.set(scoped, { data: snapshot.data, timestamp: 0 });
      seeded += 1;
    }

    perfMark('cache:hydrate', { entries: seeded, ms: Date.now() - startedAt });
  }

  private scopedKey(key: string): string {
    return `${this.scope}:${key}`;
  }

  /**
   * Retrieves an entry from cache if present and within TTL.
   */
  get<T>(key: string, ttl = DEFAULT_TTL): T | null {
    const entry = this.cache.get(this.scopedKey(key));
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttl) return null;

    // Refresh LRU position
    const scoped = this.scopedKey(key);
    this.cache.delete(scoped);
    this.cache.set(scoped, entry);
    return entry.data as T;
  }

  /**
   * Retrieves an entry from cache even if its TTL has expired (stale data).
   */
  getStale<T>(key: string): T | null {
    const scoped = this.scopedKey(key);
    const entry = this.cache.get(scoped);
    if (!entry) return null;

    // Refresh LRU position
    this.cache.delete(scoped);
    this.cache.set(scoped, entry);
    return entry.data as T;
  }

  /**
   * Stores data in the cache with the current timestamp, enforcing LRU eviction.
   */
  set<T>(key: string, data: T): void {
    const scoped = this.scopedKey(key);
    if (this.cache.has(scoped)) {
      this.cache.delete(scoped);
    } else if (this.cache.size >= MAX_CACHE_SIZE) {
      // Evict oldest entry (first key in Map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(scoped, { data, timestamp: Date.now() });
  }

  /**
   * Deletes all cache entries whose key starts with the given prefix, in memory
   * and on disk.
   */
  invalidate(keyPrefix: string): void {
    const scopedPrefix = this.scopedKey(keyPrefix);
    for (const key of this.cache.keys()) {
      if (key.startsWith(scopedPrefix)) {
        this.cache.delete(key);
        this.inFlight.delete(key);
      }
    }
    // Capture the scope now: the fire-and-forget removal must target the scope
    // that owned the entries, not whichever one is current when it lands.
    const scope = this.scope;
    void removeScopeKeys(scope, keyPrefix);
  }

  /**
   * Clears the entire in-memory cache and the current scope's disk snapshots.
   */
  clear(): void {
    const scope = this.scope;
    this.cache.clear();
    this.inFlight.clear();
    void removeScopeSnapshots(scope);
  }

  /**
   * Fetches data using Stale-While-Revalidate pattern.
   * - If non-stale cached data exists (and !forceRefresh), returns it immediately.
   * - If stale cached data exists (and !forceRefresh), returns stale data immediately and triggers background revalidation.
   * - Otherwise, fetches directly and returns the new data.
   */
  async fetchWithSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: SWROptions<T> = {},
  ): Promise<T> {
    const { forceRefresh = false, ttl = DEFAULT_TTL, onUpdate, persist = false } = options;
    const scoped = this.scopedKey(key);
    const now = Date.now();
    const entry = this.cache.get(scoped);

    // 1. Valid cache hit
    if (!forceRefresh && entry && now - entry.timestamp <= ttl) {
      this.cache.delete(scoped);
      this.cache.set(scoped, entry);
      return entry.data as T;
    }

    // 2. Stale cache hit: return stale immediately, revalidate in background
    if (!forceRefresh && entry) {
      this.runBackgroundFetch(key, fetcher, onUpdate, persist);
      return entry.data as T;
    }

    // 3. No cache or forceRefresh: fetch directly (deduplicating in-flight requests)
    return this.runForegroundFetch(key, fetcher, onUpdate, persist);
  }

  private async runForegroundFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    onUpdate?: (data: T) => void,
    persist = false,
  ): Promise<T> {
    // `key` is the caller's raw (unscoped) key. Scope once, here, for the
    // in-flight map — `set()` scopes again for storage. Passing an already
    // scoped key down (as this once did) double-scoped every write to
    // `scope:scope:key`, so `fetchWithSWR` never found its own entries and
    // every "warm" load was a full network round trip.
    const scoped = this.scopedKey(key);
    const scopeAtStart = this.scope;
    const existing = this.inFlight.get(scoped);
    if (existing) {
      const data = await existing;
      if (onUpdate) onUpdate(data);
      return data as T;
    }

    const promise = fetcher()
      .then((data) => {
        // An account switch clears the cache while this request is still in
        // flight. Writing here would hand one account's rows to the next
        // (memory and, with `persist`, disk), so drop the result instead.
        if (this.scope === scopeAtStart) {
          this.set(key, data);
          if (persist) this.persistSnapshot(key, data);
        }
        this.inFlight.delete(scoped);
        if (onUpdate) onUpdate(data);
        return data;
      })
      .catch((err) => {
        this.inFlight.delete(scoped);
        throw err;
      });

    this.inFlight.set(scoped, promise);
    return promise;
  }

  private runBackgroundFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    onUpdate?: (data: T) => void,
    persist = false,
  ): void {
    const scoped = this.scopedKey(key);
    const scopeAtStart = this.scope;
    if (this.inFlight.has(scoped)) return;

    const promise = fetcher()
      .then((data) => {
        if (this.scope === scopeAtStart) {
          this.set(key, data);
          if (persist) this.persistSnapshot(key, data);
        }
        this.inFlight.delete(scoped);
        if (onUpdate) onUpdate(data);
        return data;
      })
      .catch((err) => {
        this.inFlight.delete(scoped);
        console.warn(`[apiCache] Background revalidation failed for key "${key}":`, err);
      });

    this.inFlight.set(scoped, promise);
  }

  /**
   * Fire-and-forget disk write, deferred to a macrotask so serializing a large
   * list never runs in the same task that paints its rows.
   */
  private persistSnapshot<T>(key: string, data: T): void {
    const scope = this.scope;
    setTimeout(() => {
      // Scope changed again between the fetch landing and this write.
      if (this.scope !== scope) return;
      void writeScopeSnapshot(scope, key, data);
    }, 0);
  }
}

export const apiCache = new ApiCache();
