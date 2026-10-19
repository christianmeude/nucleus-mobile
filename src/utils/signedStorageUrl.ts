/**
 * Signed storage URLs for paper PDFs.
 *
 * Two problems this solves, both on the paper-open critical path:
 *
 *  1. **Duplication.** The student facade and the faculty facade each carried
 *     their own `extractStoragePathFromUrl` copy and their own `createSignedUrl`
 *     call, with drifted TTLs and error handling.
 *  2. **No reuse.** `createSignedUrl` mints a *fresh* URL (and therefore a fresh
 *     token) on every call. Every paper open therefore produced a URL the reader
 *     WebView had never seen, so the WebView's HTTP cache missed and the PDF bytes
 *     were re-downloaded from storage each time. Memoizing by storage path means a
 *     re-opened paper reuses the same URL string, so the WebView serves the PDF
 *     from cache.
 *
 * Cached URLs are dropped on identity change (`clearSignedUrlCache()`, called by
 * `AuthContext`) so one account can never hand another a URL minted for it, and
 * they expire well before the signed URL itself does.
 */
import { supabase } from '../lib/supabase';

/** Bucket that holds paper PDFs. */
export const RESEARCH_PAPERS_BUCKET = 'research-papers';

/** Lifetime we request for a signed URL, in seconds. */
export const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * How long a minted URL is reused. Comfortably below `SIGNED_URL_TTL_SECONDS`
 * so a cached URL is never served close to expiry.
 */
export const SIGNED_URL_CACHE_TTL_MS = 45 * 60 * 1000;

interface CachedSignedUrl {
  url: string;
  expiresAt: number;
}

const cache = new Map<string, CachedSignedUrl>();

/** Drops every memoized signed URL. Call on any identity change. */
export function clearSignedUrlCache(): void {
  cache.clear();
}

/**
 * Pulls the storage object path out of a stored `file_url`.
 *
 * Handles the three shapes the database actually contains: a public storage URL
 * (`.../object/public/research-papers/<path>`), a signed URL (same path shape),
 * and a bare path (`<path>`, occasionally with a leading slash).
 */
export function extractStoragePathFromUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;

  const trimmed = fileUrl.trim();
  if (!trimmed) return null;

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^\/+/, '') || null;
  }

  try {
    const parsed = new URL(trimmed);
    const marker = `/object/public/${RESEARCH_PAPERS_BUCKET}/`;
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex >= 0) {
      return parsed.pathname.slice(markerIndex + marker.length).replace(/^\//, '') || null;
    }

    const segments = parsed.pathname.split(`/${RESEARCH_PAPERS_BUCKET}/`);
    if (segments.length > 1) {
      return segments[1].replace(/^\//, '') || null;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Returns a usable URL for a storage object, memoized by bucket + path.
 * Resolves `null` when the object cannot be signed — callers fall back to the
 * stored URL rather than failing the whole screen.
 */
export async function getSignedStorageUrl(
  storagePath: string,
  bucket: string = RESEARCH_PAPERS_BUCKET,
): Promise<string | null> {
  const key = `${bucket}/${storagePath}`;

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      console.warn('[getSignedStorageUrl] Signed URL creation failed:', error);
      return null;
    }

    cache.set(key, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_URL_CACHE_TTL_MS });
    return data.signedUrl;
  } catch (error) {
    console.warn('[getSignedStorageUrl] Signed URL creation threw:', error);
    return null;
  }
}
