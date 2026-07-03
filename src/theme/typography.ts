import { PixelRatio, type TextStyle } from 'react-native';

/**
 * NUcleus typography tokens.
 *
 * Two families (UX remodel — cool/minimal direction):
 *   - `families.ui = IBM Plex Sans`       — every UI surface (default).
 *   - `families.display = Source Serif 4` — sparingly, for titles / reading-view
 *                                  headings (e.g. ResearchDetail paper title, card
 *                                  titles). NEVER for UI chrome like buttons/labels.
 *
 * React Native does not select a weight from a single family name + numeric weight;
 * each weight must reference its own registered font name. Both families ship via
 * `@expo-google-fonts/ibm-plex-sans` and `@expo-google-fonts/source-serif-4` and
 * are loaded in App.tsx.
 */

const MAX_FONT_SCALE = 1.3;

export const scaledFontSize = (size: number): number => {
  const scale = Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);
  return Math.round(size * scale);
};

export const families = {
  ui: {
    regular: 'IBMPlexSans_400Regular',
    medium: 'IBMPlexSans_500Medium',
    semibold: 'IBMPlexSans_600SemiBold',
    bold: 'IBMPlexSans_700Bold',
  },
  display: {
    regular: 'SourceSerif4_400Regular',
    medium: 'SourceSerif4_500Medium',
    semibold: 'SourceSerif4_600SemiBold',
    bold: 'SourceSerif4_700Bold',
  },
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
 * mobile reading").
 *
 * `display` is the only style that uses the Source Serif 4 serif by default.
 */
export const typography = {
  display: make('display', 'semibold', 30, 38, 0.2),
  h1: make('ui', 'bold', 26, 34, 0),
  h2: make('ui', 'bold', 20, 28, 0),
  h3: make('ui', 'semibold', 17, 24, 0),
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
