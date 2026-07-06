import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'browse.recentSearches';
const MAX_RECENT = 6;

/**
 * Persisted recent search terms for the Browse landing. Most-recent first,
 * de-duplicated case-insensitively, capped at {@link MAX_RECENT}. Backed by
 * AsyncStorage; all writes are fire-and-forget so the UI never blocks on disk.
 */
export const useRecentSearches = () => {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecent(parsed.filter((item): item is string => typeof item === 'string'));
        }
      })
      .catch(() => {
        /* corrupt or missing store — start empty */
      });
    return () => {
      active = false;
    };
  }, []);

  const write = useCallback((next: string[]) => {
    setRecent(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      /* best-effort persistence */
    });
  }, []);

  const addRecent = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      setRecent((prev) => {
        const next = [
          trimmed,
          ...prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
        ].slice(0, MAX_RECENT);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const clearRecent = useCallback(() => write([]), [write]);

  return { recent, addRecent, clearRecent };
};
