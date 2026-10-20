/**
 * AsyncStorage I/O for list snapshots. No cache policy lives here — see
 * `apiCache.ts` for when entries are written, hydrated, and dropped (ADR 0007).
 *
 * Keys are versioned and scoped so two accounts on one device can never read
 * each other's rows, and a future envelope change can ignore old keys wholesale.
 * Every function tolerates a broken store: a corrupt entry is deleted, and a
 * failed write is dropped, never thrown into a caller's fetch path.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Versioned namespace. Bump the version to orphan an incompatible envelope. */
export const CACHE_STORAGE_PREFIX = 'apiCache:v1';

/** Snapshots older than this are discarded at hydration (never served). */
export const MAX_DISK_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Per-entry cap. Android's AsyncStorage is SQLite-backed and large single
 * values are both slow to write and historically flaky. List snapshots that
 * grow past this are dropped rather than risking the whole store.
 */
export const MAX_SNAPSHOT_CHARS = 512 * 1024;

/** A hung native store must never hold up app startup. */
export const HYDRATE_TIMEOUT_MS = 2_000;

export interface StoredSnapshot {
  /** Raw, unscoped cache key, exactly as passed to `fetchWithSWR`. */
  key: string;
  data: unknown;
  /** When the cached response arrived — not when it was written to disk. */
  timestamp: number;
}

interface Envelope {
  data: unknown;
  timestamp: number;
}

function scopePrefix(scope: string): string {
  return `${CACHE_STORAGE_PREFIX}:${scope}:`;
}

/** Full AsyncStorage key for one scoped cache entry. */
export function snapshotStorageKey(scope: string, key: string): string {
  return `${scopePrefix(scope)}${key}`;
}

function isEnvelope(value: unknown): value is Envelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Envelope>;
  return typeof candidate.timestamp === 'number' && 'data' in candidate;
}

async function keysForScope(scope: string): Promise<string[]> {
  const prefix = scopePrefix(scope);
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((key) => key.startsWith(prefix));
}

/**
 * Reads every snapshot for `scope`, deleting entries that are corrupt, wrongly
 * shaped, or older than {@link MAX_DISK_AGE_MS}. Keys are returned unscoped so
 * the cache can adopt them as if they had been fetched normally.
 */
export async function readScopeSnapshots(
  scope: string,
  now: number = Date.now(),
): Promise<StoredSnapshot[]> {
  const prefix = scopePrefix(scope);
  const storageKeys = await keysForScope(scope);
  if (storageKeys.length === 0) return [];

  const pairs = await AsyncStorage.multiGet(storageKeys);
  const snapshots: StoredSnapshot[] = [];
  const doomed: string[] = [];

  for (const [storageKey, raw] of pairs) {
    if (!raw) {
      doomed.push(storageKey);
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      doomed.push(storageKey);
      continue;
    }

    if (!isEnvelope(parsed) || now - parsed.timestamp > MAX_DISK_AGE_MS) {
      doomed.push(storageKey);
      continue;
    }

    snapshots.push({
      key: storageKey.slice(prefix.length),
      data: parsed.data,
      timestamp: parsed.timestamp,
    });
  }

  if (doomed.length > 0) {
    await AsyncStorage.multiRemove(doomed).catch(() => {
      /* best-effort cleanup */
    });
  }

  return snapshots;
}

/**
 * Serializes and writes one snapshot. Returns false when the payload is over
 * the size cap (in which case any previous snapshot for that key is removed).
 * Failures are logged once and swallowed — persistence is an optimization.
 */
export async function writeScopeSnapshot(
  scope: string,
  key: string,
  data: unknown,
): Promise<boolean> {
  const storageKey = snapshotStorageKey(scope, key);

  try {
    const serialized = JSON.stringify({ data, timestamp: Date.now() } satisfies Envelope);

    if (serialized.length > MAX_SNAPSHOT_CHARS) {
      console.warn(
        `[apiCacheStorage] Snapshot for "${key}" is ${serialized.length} chars (cap ${MAX_SNAPSHOT_CHARS}); dropping it.`,
      );
      await AsyncStorage.removeItem(storageKey).catch(() => {});
      return false;
    }

    await AsyncStorage.setItem(storageKey, serialized);
    return true;
  } catch (error) {
    console.warn(`[apiCacheStorage] Failed to persist "${key}":`, error);
    return false;
  }
}

/** Removes every snapshot for one scope. */
export async function removeScopeSnapshots(scope: string): Promise<void> {
  try {
    const keys = await keysForScope(scope);
    if (keys.length > 0) {
      await AsyncStorage.multiRemove(keys);
    }
  } catch (error) {
    console.warn(`[apiCacheStorage] Failed to clear scope "${scope}":`, error);
  }
}

/** Removes the snapshots in `scope` whose raw cache key starts with `keyPrefix`. */
export async function removeScopeKeys(scope: string, keyPrefix: string): Promise<void> {
  try {
    const fullPrefix = `${scopePrefix(scope)}${keyPrefix}`;
    const keys = await keysForScope(scope);
    const matches = keys.filter((key) => key.startsWith(fullPrefix));
    if (matches.length > 0) {
      await AsyncStorage.multiRemove(matches);
    }
  } catch (error) {
    console.warn(`[apiCacheStorage] Failed to drop "${keyPrefix}" for scope "${scope}":`, error);
  }
}
