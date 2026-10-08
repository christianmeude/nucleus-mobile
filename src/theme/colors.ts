import { PlatformColor } from 'react-native';

/**
 * NUcleus brand color tokens.
 *
 * Working values anchored to the official NUcleus logo. Per
 * docs/plans/UI_OVERHAUL.md §2.1, these are starting points and are
 * subject to fine-tuning during the overhaul; any brand-confirmed
 * swatch lands in this file as a single edit.
 *
 * Usage rules (from docs/PRODUCT_ROADMAP.md §2):
 * - Blue family for primary UI, navigation, and links.
 * - Gold for emphasis and important affordances only — never decoration.
 * - Neutrals for surfaces, dividers, and text.
 *
 * Runtime theming (A0): `palette` is the raw, theme-invariant hue set. The
 * semantic layer ships as two schemes — `light` and `dark` — sharing the
 * `ColorScheme` shape, swapped at runtime by `ThemeProvider` / `useThemedStyles`.
 * `light` is the canonical map (also exported as `colors` for backward-compat,
 * so every unmigrated consumer keeps compiling and rendering light).
 */

export const palette = {
  navy: {
    50: '#EAF0FB',
    100: '#D2DEF5',
    200: '#A3BBE9',
    300: '#5F7EC9',
    400: '#2E5BC9',
    500: '#1B3A8C',
    600: '#16307A',
    700: '#102560',
    800: '#0B1B47',
    900: '#06112E',
  },
  // Retuned to a true metallic gold (2026-07-08): the prior ramp centered on
  // #F5A623 read as a strong marigold yellow. This ramp is less orange/saturated
  // — an "old gold" that reads as gold, not yellow — while keeping enough
  // lightness for dark text (onAccent) to stay legible on the 400–500 fills.
  gold: {
    50: '#FBF6E8',
    100: '#F4E7BD',
    200: '#E9D389',
    300: '#DCC05B',
    400: '#D3B03F',
    500: '#CDA434',
    600: '#AE8829',
    700: '#82661E',
    800: '#584615',
    900: '#342908',
  },
  slate: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  success: {
    100: '#D1FAE5',
    400: '#34D399',
    500: '#059669',
    600: '#047857',
  },
  warning: {
    100: '#FEF3C7',
    400: '#FBBF24',
    500: '#D97706',
    600: '#B45309',
  },
  danger: {
    100: '#FEE2E2',
    400: '#F87171',
    500: '#DC2626',
    600: '#B91C1C',
  },
} as const;

/**
 * Semantic color scheme shape. Both `light` and `dark` are annotated with it,
 * which (a) widens values to `string` so the two schemes share one type, and
 * (b) fails typecheck if either scheme is missing a key the other declares.
 */
export interface ColorScheme {
  brand: {
    primary: string;
    primaryHover: string;
    primaryPressed: string;
    primarySoft: string;
    primarySurface: string;
    accent: string;
    accentHover: string;
    accentSoft: string;
    accentSurface: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    disabled: string;
    onBrand: string;
    onAccent: string;
    link: string;
  };
  surface: {
    base: string;
    raised: string;
    sunken: string;
    overlay: string;
  };
  border: {
    subtle: string;
    strong: string;
    focus: string;
  };
  state: {
    success: string;
    successSurface: string;
    warning: string;
    warningSurface: string;
    danger: string;
    dangerSurface: string;
  };
}

// — Light scheme (canonical; the merged #24 "Modern Clarity" calibration). —
export const light: ColorScheme = {
  brand: {
    primary: palette.navy[500],
    primaryHover: palette.navy[600],
    primaryPressed: palette.navy[700],
    primarySoft: palette.navy[100],
    primarySurface: palette.navy[50],
    accent: palette.gold[500],
    accentHover: palette.gold[600],
    accentSoft: palette.gold[100],
    accentSurface: palette.gold[50],
  },
  text: {
    primary: palette.slate[900],
    secondary: palette.slate[600],
    muted: palette.slate[500],
    disabled: palette.slate[400],
    onBrand: palette.slate[0],
    onAccent: palette.slate[900],
    link: palette.navy[500],
  },
  surface: {
    base: '#F1F4FA',
    raised: '#F9FBFF',
    sunken: palette.slate[100],
    overlay: 'rgba(15, 23, 42, 0.45)',
  },
  border: {
    subtle: palette.slate[200],
    strong: palette.slate[300],
    focus: palette.navy[400],
  },
  state: {
    success: palette.success[600],
    successSurface: palette.success[100],
    warning: palette.warning[500],
    warningSurface: palette.warning[100],
    danger: palette.danger[600],
    dangerSurface: palette.danger[100],
  },
};

// — Dark scheme (A0): deep-navy surfaces, navy-tinted light text, navy/gold
//   amplified for contrast on dark. Same keys as `light` (enforced by the type). —
export const dark: ColorScheme = {
  brand: {
    primary: palette.navy[400],
    primaryHover: palette.navy[300],
    primaryPressed: palette.navy[500],
    primarySoft: palette.navy[400] + '33', // 20% opacity
    primarySurface: palette.navy[900],
    accent: palette.gold[400],
    accentHover: palette.gold[300],
    accentSoft: palette.gold[400] + '2E', // 18% opacity
    accentSurface: palette.gold[400] + '1A', // 10% opacity
  },
  text: {
    primary: palette.navy[50],
    secondary: palette.navy[200],
    muted: '#8394B4',
    disabled: '#6B7DA3',
    onBrand: palette.slate[0],
    onAccent: palette.slate[900],
    link: palette.navy[300],
  },
  surface: {
    base: '#0A1226',
    raised: '#111C38',
    sunken: '#070E1F',
    overlay: 'rgba(3, 8, 20, 0.60)',
  },
  border: {
    subtle: 'rgba(163, 187, 233, 0.18)',
    strong: 'rgba(163, 187, 233, 0.38)',
    focus: palette.navy[300],
  },
  state: {
    success: palette.success[400],
    successSurface: palette.success[400] + '24', // 14% opacity
    warning: palette.warning[400],
    warningSurface: palette.warning[400] + '24',
    danger: palette.danger[400],
    dangerSurface: palette.danger[400] + '24',
  },
};

/** Backward-compat alias — `theme.colors` resolves to the light scheme. */
export const colors = light;

/** OS-specific platform colors */
export const platformColors = {
  ios: {
    primary: PlatformColor('systemBlue'),
    background: PlatformColor('systemBackground'),
    text: PlatformColor('label'),
  },
  android: {
    primary: PlatformColor('@android:color/holo_blue_light'),
    background: PlatformColor('@android:color/background_light'),
    text: PlatformColor('@android:color/primary_text_light'),
  },
};

/** Runtime-swappable semantic schemes, keyed by name. */
export const schemes = { light, dark };

export type Palette = typeof palette;
export type Colors = ColorScheme;
export type SchemeName = keyof typeof schemes;
