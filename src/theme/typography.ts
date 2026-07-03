import { PixelRatio, type TextStyle } from 'react-native';

/**
 * NUcleus typography tokens.
 *
 * Two families ("Geometric & Readable" direction):
 *   - `families.ui = Source Sans 3` — every UI surface (default): chrome, labels,
 *                                  buttons, chips, metadata.
 *   - `families.display = Raleway` — headings at every level (display, h1-h3) and
 *                                  reading-view titles (e.g. ResearchDetail paper
 *                                  title, card titles). NEVER for UI chrome like
 *                                  buttons/labels.
 *
 * React Native does not select a weight from a single family name + numeric weight;
 * each weight must reference its own registered font name. Both families ship via
 * `@expo-google-fonts/source-sans-3` and `@expo-google-fonts/raleway` and are
 * loaded in App.tsx.
 */

const MAX_FONT_SCALE = 1.3;

export const scaledFontSize = (size: number): number => {
  const scale = Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);
  return Math.round(size * scale);
};

export const families = {
  ui: {
    regular: 'SourceSans3_400Regular',
    medium: 'SourceSans3_500Medium',
    semibold: 'SourceSans3_600SemiBold',
    bold: 'SourceSans3_700Bold',
  },
  display: {
    regular: 'Raleway_400Regular',
    medium: 'Raleway_500Medium',
    semibold: 'Raleway_600SemiBold',
    bold: 'Raleway_700Bold',
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
 * mobile reading"), sized up for breathing room: `display` and `h1`-`h3` all
 * use the Raleway display family and sit a step larger than before. Body/UI
 * sizes are unchanged — only headings size up.
 */
export const typography = {
  display: make('display', 'semibold', 32, 40, 0.2),
  h1: make('display', 'bold', 28, 36, 0),
  h2: make('display', 'bold', 22, 30, 0),
  h3: make('display', 'semibold', 18, 26, 0),
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
