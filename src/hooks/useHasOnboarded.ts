import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'firstRun.hasOnboarded';

/**
 * Whether the student has finished (or skipped) the first-run onboarding carousel
 * (A4). One `AsyncStorage` boolean, checked once at the `AppNavigator` gate so a
 * returning student never sees the intro again — persists across app opens until
 * the store is cleared (app cache clear / reinstall). Same shape as
 * `useHasSearchedOnce`.
 */
export const useHasOnboarded = () => {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (active && raw === 'true') setHasOnboarded(true);
      })
      .catch(() => {
        /* corrupt or missing store — treat as first run */
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const markOnboarded = useCallback(() => {
    setHasOnboarded(true);
    AsyncStorage.setItem(STORAGE_KEY, 'true').catch(() => {
      /* best-effort persistence */
    });
  }, []);

  return { hasOnboarded, loaded, markOnboarded };
};
