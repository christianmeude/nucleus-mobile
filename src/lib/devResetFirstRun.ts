import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, DevSettings } from 'react-native';

/**
 * TEMP QA helper (#69) — REMOVE before merging.
 *
 * Wipes the two first-run flags so the next launch behaves like a fresh install:
 * the A4 onboarding carousel replays and the navigation coachmarks re-arm. Then
 * reloads the JS bundle (dev client only) so the gate re-evaluates immediately
 * instead of needing a manual restart.
 *
 * Keys are the private `STORAGE_KEY`s from `useHasOnboarded` /
 * `useSeenCoachmarks` — kept in sync by hand for the life of this throwaway.
 */
const FIRST_RUN_KEYS = ['firstRun.hasOnboarded', 'firstRun.seenCoachmarks'];

export const resetFirstRun = () => {
  Alert.alert(
    'Reset first-run?',
    'Clears onboarding + coachmark progress and reloads the app as if freshly installed.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove(FIRST_RUN_KEYS);
          } catch {
            /* best-effort — a failed clear just means onboarding won't replay */
          }
          if (typeof DevSettings?.reload === 'function') {
            DevSettings.reload();
          } else {
            Alert.alert(
              'Cleared',
              'Fully close and reopen the app to see onboarding again.',
            );
          }
        },
      },
    ],
  );
};
