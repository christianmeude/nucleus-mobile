import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'browse.hasSearchedOnce';

/**
 * Whether the student has ever committed a Browse search or explore gesture.
 * Once true, the Browse landing stops collapsing back to the idle greeting —
 * it persists across app opens until the flag is cleared with the rest of
 * AsyncStorage (app cache clear / reinstall).
 */
export const useHasSearchedOnce = () => {
  const [hasSearchedOnce, setHasSearchedOnce] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (active && raw === 'true') setHasSearchedOnce(true);
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

  const markSearchedOnce = useCallback(() => {
    setHasSearchedOnce(true);
    AsyncStorage.setItem(STORAGE_KEY, 'true').catch(() => {
      /* best-effort persistence */
    });
  }, []);

  return { hasSearchedOnce, loaded, markSearchedOnce };
};
