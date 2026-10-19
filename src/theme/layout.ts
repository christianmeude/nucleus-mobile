/**
 * NUcleus layout tokens.
 *
 * Theme-invariant geometry that isn't spacing/radii: the limits that keep
 * content readable rather than merely filling whatever the viewport offers.
 *
 * These exist because the app is phone-first but runs unconstrained on large
 * screens. `app.config.ts` requests portrait, and the manifest carries
 * `android:screenOrientation="portrait"`, but Android 16+ ignores orientation
 * restrictions on large screens — so a tablet (or a landscape-capable viewport)
 * lays the app out at full width, and long-form copy ends up spanning ~150
 * characters per line instead of a readable ~75.
 */

import type { ViewStyle } from 'react-native';

export const layout = {
  /**
   * Max width (dp) of a long-form reading column.
   *
   * Calibrated against `typography.body` (Inter 15/22): at an average advance of
   * ~7.5dp, 600dp lands at ~78 characters per line — inside the classic 45-75
   * read-optimised band, and far short of the ~150 a 1280dp tablet produces
   * unconstrained.
   */
  measure: 600,
} as const;

export type Layout = typeof layout;

/**
 * Centered reading column.
 *
 * Spread into a `contentContainerStyle` (or any container style) to cap
 * long-form text at `layout.measure` and center it on the viewport. Applied to
 * the scrolling containers rather than to `Screen`, because `Screen` only pads
 * a plain `View` — a `ScrollView` rendered as its child fills the full padded
 * width regardless, so constraining `Screen` leaves the content unaffected.
 *
 * `maxWidth` is inert below the cap, so narrow phones render exactly as they
 * did before — no breakpoint, no width hook, no orientation logic.
 *
 * The cap is on the container *box*, so a surface that carries its own
 * horizontal padding measures slightly under `layout.measure` (the notice's
 * 16dp gutter yields ~568dp of text); either way the result stays inside the
 * readable band. Surfaces with no padding of their own — like the sign-in
 * field column — get the full 600dp.
 *
 * `as const satisfies ViewStyle` rather than a `: ViewStyle` annotation: the
 * assertion pins `width`/`alignSelf` to their literal types (cheap for the
 * checker, and exact when spread into a themed StyleSheet) while `satisfies`
 * still fails the build if these keys stop being valid `ViewStyle` — e.g. a
 * typo like `alignSelf: 'middle'`.
 */
export const readingColumn = {
  width: '100%',
  maxWidth: layout.measure,
  alignSelf: 'center',
} as const satisfies ViewStyle;
