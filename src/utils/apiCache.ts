/**
 * In-memory Stale-While-Revalidate (SWR) and LRU cache for API queries.
 * Eliminates loading skeletons and latency when navigating between feeds or tabs
 * by returning cached data synchronously/instantly while updating in the background.
 */

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
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();

  /**
   * Retrieves an entry from cache if present and within TTL.
   */
  get<T>(key: string, ttl = DEFAULT_TTL): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttl) return null;

    // Refresh LRU position
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data as T;
  }

  /**
   * Retrieves an entry from cache even if its TTL has expired (stale data).
   */
  getStale<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Refresh LRU position
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data as T;
  }

  /**
   * Stores data in the cache with the current timestamp, enforcing LRU eviction.
   */
  set<T>(key: string, data: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= MAX_CACHE_SIZE) {
      // Evict oldest entry (first key in Map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Deletes all cache entries whose key starts with the given prefix.
   */
  invalidate(keyPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
        this.inFlight.delete(key);
      }
    }
  }

  /**
   * Clears the entire cache.
   */
  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
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
    options: SWROptions<T> = {}
  ): Promise<T> {
    const { forceRefresh = false, ttl = DEFAULT_TTL, onUpdate } = options;
    const now = Date.now();
    const entry = this.cache.get(key);

    // 1. Valid cache hit
    if (!forceRefresh && entry && now - entry.timestamp <= ttl) {
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry.data as T;
    }

    // 2. Stale cache hit: return stale immediately, revalidate in background
    if (!forceRefresh && entry) {
      this.runBackgroundFetch(key, fetcher, onUpdate);
      return entry.data as T;
    }

    // 3. No cache or forceRefresh: fetch directly (deduplicating in-flight requests)
    return this.runForegroundFetch(key, fetcher, onUpdate);
  }

  private async runForegroundFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    onUpdate?: (data: T) => void
  ): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      const data = await existing;
      if (onUpdate) onUpdate(data);
      return data as T;
    }

    const promise = fetcher()
      .then((data) => {
        this.set(key, data);
        this.inFlight.delete(key);
        if (onUpdate) onUpdate(data);
        return data;
      })
      .catch((err) => {
        this.inFlight.delete(key);
        throw err;
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  private runBackgroundFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    onUpdate?: (data: T) => void
  ): void {
    if (this.inFlight.has(key)) return;

    const promise = fetcher()
      .then((data) => {
        this.set(key, data);
        this.inFlight.delete(key);
        if (onUpdate) onUpdate(data);
        return data;
      })
      .catch((err) => {
        this.inFlight.delete(key);
        console.warn(`[apiCache] Background revalidation failed for key "${key}":`, err);
      });

    this.inFlight.set(key, promise);
  }
}

export const apiCache = new ApiCache();
