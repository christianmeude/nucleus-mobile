/**
 * NUcleus theme — single source of truth for design tokens.
 *
 * A0 adds runtime theming: the `schemes` (light/dark) from colors.ts are
 * composed with the theme-invariant tokens (spacing / radii / typography /
 * shadows / motion) into a full `themes` map. `ThemeProvider` selects the
 * active one and `useThemedStyles` rebuilds StyleSheets when it changes.
 *
 * Backward-compat: `export const theme` remains the LIGHT theme, so every
 * consumer still doing `import { theme } from '../theme'` keeps compiling and
 * renders light until it migrates to `useTheme()` / `useThemedStyles()`.
 */
import { palette, schemes, platformColors, type SchemeName } from './colors';
import { families, fontWeightToKey, typography } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';
import { radii } from './radii';
import { motion } from './motion';
import { gradients } from './gradients';

const buildTheme = (scheme: SchemeName) => ({
  colors: schemes[scheme],
  platformColors,
  palette,
  typography,
  fontFamilies: families,
  fontWeights: fontWeightToKey,
  spacing,
  radii,
  shadows,
  motion,
  gradients,
});

/** Full theme objects per scheme — consumed by `ThemeProvider`. */
export const themes = {
  light: buildTheme('light'),
  dark: buildTheme('dark'),
};

/** Backward-compat: the light theme, for unmigrated `import { theme }` uses. */
export const theme = themes.light;

export type Theme = typeof themes.light;

export { colors, palette, schemes, platformColors } from './colors';
export type { Colors, Palette, SchemeName } from './colors';
export {
  families as fontFamilies,
  fontWeightToKey as fontWeights,
  typography,
} from './typography';
export type {
  FontFamilyKey,
  FontWeightKey,
  TypographyKey,
  TypographyScale,
} from './typography';
export { spacing } from './spacing';
export type { Spacing, SpacingKey } from './spacing';
export { radii } from './radii';
export type { Radii, RadiiKey } from './radii';
export { shadows } from './shadows';
export type { Shadows, ShadowsKey } from './shadows';
export { motion } from './motion';
export type { Motion } from './motion';
export { gradients } from './gradients';
export type { Gradients, GradientKey } from './gradients';
