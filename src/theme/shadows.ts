/**
 * NUcleus elevation tokens.
 *
 * Soft elevation per docs/PRODUCT_ROADMAP.md §2 ("Soft elevation: use gentle
 * shadows to establish depth without heavy skeumorphism") and §5 ("clean card
 * surfaces with clear affordances; avoid heavy borders — prefer soft shadows
 * and spacing").
 *
 * Each level packages the iOS shadow* properties and the Android `elevation`
 * value as a `ViewStyle` fragment, so consumers can spread it directly:
 *
 *   <View style={[styles.card, theme.shadows.level1]} />
 */

import type { ViewStyle } from 'react-native';

const black = '#000000';

const level0: ViewStyle = {
  shadowColor: black,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
};

const level1: ViewStyle = {
  shadowColor: '#0B1B47',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 3,
  elevation: 1,
};

const level2: ViewStyle = {
  shadowColor: '#0B1B47',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.13,
  shadowRadius: 12,
  elevation: 4,
};

const tinted = {
  /** Navy tinted shadow for floating elements (like nav bar) */
  primary: {
    boxShadow: '0 14px 34px -14px rgba(11, 27, 71, 0.6)',
  } as ViewStyle,
  /** Gold tinted shadow for the Submit FAB */
  accent: {
    boxShadow: '0 8px 12px 0 rgba(74, 56, 0, 0.45)',
  } as ViewStyle,
};

export const shadows = {
  level0,
  level1,
  level2,
  tinted,
} as const;

export type Shadows = typeof shadows;
export type ShadowsKey = keyof Shadows;
