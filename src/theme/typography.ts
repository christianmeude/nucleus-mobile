import { PixelRatio, type TextStyle } from 'react-native';

/**
 * NUcleus typography tokens.
 *
 * Single app-wide typeface: Inter. Visual hierarchy comes from size/weight/
 * letter-spacing per scale entry, not from a second family.
 *
 * `families.ui` and `families.display` both resolve to Inter weights; the
 * two keys are kept (rather than collapsed to one) so existing call sites —
 * `t.fontFamilies.display.*` for heading roles, `t.fontFamilies.ui.*` for
 * everything else — don't need a mass find-replace across the codebase.
 *
 * Heading sizes are still calibrated against the Material 3 type scale roles
 * (Headline/Title), not sized up arbitrarily — see the `typography` scale below.
 *
 * React Native does not select a weight from a single family name + numeric weight;
 * each weight must reference its own registered font name. Inter ships via
 * `@expo-google-fonts/inter` and is loaded in App.tsx.
 */

const MAX_FONT_SCALE = 1.3;

export const scaledFontSize = (size: number): number => {
  const scale = Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);
  return Math.round(size * scale);
};

const inter = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const families = {
  ui: inter,
  display: inter,
} as const;

export type FontFamilyKey = 'ui' | 'display';
export type FontWeightKey = 'regular' | 'medium' | 'semibold' | 'bold';

type FontWeightValue = NonNullable<TextStyle['fontWeight']>;

export const fontWeightToKey: Record<FontWeightKey, FontWeightValue> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

type TypographyStyle = Required<
  Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'fontWeight'>
> & {
  letterSpacing?: number;
};

const make = (
  family: FontFamilyKey,
  weight: FontWeightKey,
  fontSize: number,
  lineHeight: number,
  letterSpacing?: number
): TypographyStyle => ({
  fontFamily: families[family][weight],
  fontWeight: fontWeightToKey[weight],
  fontSize: scaledFontSize(fontSize),
  lineHeight,
  ...(letterSpacing !== undefined ? { letterSpacing } : {}),
});

/**
 * Type scale tuned for mobile reading per roadmap §2 ("strong scale between
 * headings, subheads, body, and metadata; line lengths and sizes tuned for
 * mobile reading"), with heading sizes calibrated against the Material 3
 * type scale roles rather than sized up arbitrarily:
 *   - `display`  ≈ M3 Headline Medium (28)
 *   - `h1`       ≈ M3 Headline Small (24)
 *   - `h2`       ≈ M3 Title Large (20, unchanged)
 *   - `h3`       ≈ M3 Title Medium (17, unchanged)
 * `display` and `h1`-`h3` use the `display` family key, which now resolves
 * to Inter like everything else; sizes/weights are unchanged.
 */
export const typography = {
  display: make('display', 'semibold', 28, 36, -0.3),
  h1: make('display', 'bold', 24, 32, -0.3),
  h2: make('display', 'bold', 20, 28, -0.3),
  h3: make('display', 'semibold', 17, 24, 0),
  bodyStrong: make('ui', 'semibold', 15, 22, 0),
  body: make('ui', 'regular', 15, 22, 0),
  bodySmall: make('ui', 'regular', 13, 20, 0),
  label: make('ui', 'semibold', 13, 18, 0.1),
  metadata: make('ui', 'medium', 12, 18, 0.1),
  caption: make('ui', 'regular', 11, 16, 0.2),
  button: make('ui', 'semibold', 15, 20, 0.2),
} as const;

export type TypographyScale = typeof typography;
export type TypographyKey = keyof TypographyScale;
