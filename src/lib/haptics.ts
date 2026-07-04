/**
 * Haptic feedback wrapper (expo-haptics). Thin, fire-and-forget helpers with a
 * no-op guard so callers never need to await or try/catch — on platforms or
 * simulators without a haptic engine the promise rejection is swallowed.
 */
import * as Haptics from 'expo-haptics';

const swallow = () => {};

export const haptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(swallow),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(swallow),
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(swallow),
};

export type HapticName = keyof typeof haptics;
