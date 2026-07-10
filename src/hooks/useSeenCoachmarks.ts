import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COACHMARK_ORDER, type CoachmarkId } from '../components/coachmarks/sequence';

const STORAGE_KEY = 'firstRun.seenCoachmarks';

const isCoachmarkId = (value: unknown): value is CoachmarkId =>
  typeof value === 'string' && (COACHMARK_ORDER as readonly string[]).includes(value);

/**
 * Which first-run navigation coachmarks (#69) the student has already dismissed.
 * A single `AsyncStorage` array of seen ids — the array shape (vs. the boolean
 * in {@link useHasOnboarded}) is what lets a partially-completed sequence resume
 * across app opens rather than restarting. Same hook family / lifecycle as
 * `useHasOnboarded`.
 */
export const useSeenCoachmarks = () => {
  const [seen, setSeen] = useState<CoachmarkId[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        try {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) setSeen(parsed.filter(isCoachmarkId));
        } catch {
          /* corrupt store — treat as nothing seen */
        }
      })
      .catch(() => {
        /* missing store — treat as nothing seen */
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const markSeen = useCallback((id: CoachmarkId) => {
    setSeen((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
        /* best-effort persistence */
      });
      return next;
    });
  }, []);

  return { seen, loaded, markSeen };
};
