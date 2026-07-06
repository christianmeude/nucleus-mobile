import { createRef } from 'react';
import type { View } from 'react-native';

/**
 * Shared ref bridging `App.tsx` (which wraps the app root in expo-blur's
 * `BlurTargetView`) and `StudentTabBar` (whose floating bar `BlurView` points
 * at this ref via the `blurTarget` prop).
 *
 * Android's `dimezisBlurViewSdk31Plus` blur method needs an explicit target
 * view to sample as its background — without one it silently falls back to
 * the "none" method (a flat semi-transparent view, no real blur). iOS ignores
 * this entirely (its blur is native and always renders). See:
 * https://docs.expo.dev/versions/latest/sdk/blur-view/
 */
export const navBlurTargetRef = createRef<View>();
