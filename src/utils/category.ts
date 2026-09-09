import { Category } from '../types/domain';

/** RFC 4122 UUID (v1–5). Guards raw category UUIDs from display (Issue #5). */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Build an id→name lookup from a categories list. */
export const buildCategoryNameById = (categories: Category[]): Map<string, string> =>
  new Map(categories.map((item) => [item.id, item.name]));

/**
 * Display-only category name, UUID-guarded (Issue #5).
 * Resolves an id to its name, passes through a plain (non-UUID) label,
 * and returns null when nothing resolves.
 */
export const resolveCategoryName = (
  value: string | null | undefined,
  categoryNameById: Map<string, string>,
): string | null => {
  if (!value) return null;
  if (categoryNameById.has(value)) {
    const name = categoryNameById.get(value);
    return name && name.trim() ? name : null;
  }
  return UUID_PATTERN.test(value) ? null : value;
};

/**
 * Category accent palette — solid equivalents of the web project's diverse
 * gradient starts, addressed by index. Shared so Browse and Papers render the
 * same category colors per category.
 */
export const CATEGORY_COLORS = [
  '#3674B5',
  '#578FCA',
  '#14B8A6',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  '#14B8A6',
  '#06B6D4',
] as const;

/** Fallback gray when a category id doesn't map to the palette. */
const CATEGORY_COLOR_FALLBACK = '#6B7280';

/** Build an id→accent-color lookup from a categories list. */
export const buildCategoryColorById = (categories: Category[]): Map<string, string> =>
  new Map(
    categories.map((item, index) => [item.id, CATEGORY_COLORS[index % CATEGORY_COLORS.length]]),
  );

/**
 * Resolve a category id to its accent color. Falls back to the shared gray,
 * matching the web project, when the id is unknown.
 */
export const resolveCategoryColor = (
  value: string | null | undefined,
  categoryColorById: Map<string, string>,
): string => {
  if (value && categoryColorById.has(value)) return categoryColorById.get(value) as string;
  return CATEGORY_COLOR_FALLBACK;
};

// — Contrast-safe chip palette for category labels. —

type RGB = [number, number, number];

const clamp255 = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

function normalizeHex(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return h;
}

function hexToRgb(hex: string): RGB {
  const n = parseInt(normalizeHex(hex), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb: RGB): string {
  return `#${rgb.map((v) => clamp255(v).toString(16).padStart(2, '0')).join('')}`;
}

function blendRgb(base: RGB, overlay: RGB, amount: number): RGB {
  return [
    base[0] + (overlay[0] - base[0]) * amount,
    base[1] + (overlay[1] - base[1]) * amount,
    base[2] + (overlay[2] - base[2]) * amount,
  ];
}

function channelLuminance(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG 2.x relative luminance for a hex color. */
export const relativeLuminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
};

/** WCAG contrast ratio between two hex colors (1..21). */
export const contrastRatio = (foreground: string, background: string): number => {
  const lf = relativeLuminance(foreground);
  const lb = relativeLuminance(background);
  const [hi, lo] = lf > lb ? [lf, lb] : [lb, lf];
  return (hi + 0.05) / (lo + 0.05);
};

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, 0, l];
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / delta + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  return [h / 6, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hueToRgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) {
    const v = clamp255(l * 255);
    return rgbToHex([v, v, v]);
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return rgbToHex([
    clamp255(hueToRgb(p, q, h + 1 / 3) * 255),
    clamp255(hueToRgb(p, q, h) * 255),
    clamp255(hueToRgb(p, q, h - 1 / 3) * 255),
  ]);
}

export interface CategoryChipPalette {
  /** Label foreground, guaranteed ≥ 4.5:1 against `bg`. */
  fg: string;
  /** Surface-tinted chip fill (an explicit color, no alpha at render time). */
  bg: string;
}

/** Blend `accent` at 14% into the card `surface` to produce the chip fill. */
export const categoryChipBackground = (accent: string, surface: string): string =>
  rgbToHex(blendRgb(hexToRgb(surface), hexToRgb(accent), 0.14));

/**
 * Contrast-accommodating chip palette for category labels. The accent is tinted
 * into the card surface for the chip fill so the label hue stays visible, then
 * the label color is darkened on light surfaces (or lightened on dark ones)
 * until it clears WCAG AA for small text (4.5:1). The direction handles both
 * light and dark themes. Shared by Browse and Papers so a category renders the
 * same accessible chip everywhere.
 */
export const buildCategoryChipPalette = (accent: string, surface: string): CategoryChipPalette => {
  const bg = categoryChipBackground(accent, surface);
  const [h, s, baseL] = hexToHsl(accent);
  const darken = relativeLuminance(bg) > 0.4;
  let lightness = baseL;
  let fg = accent;
  let guard = 0;
  while (contrastRatio(fg, bg) < 4.5 && guard < 24) {
    lightness = darken ? Math.max(0, lightness - 0.03) : Math.min(1, lightness + 0.03);
    fg = hslToHex(h, s, lightness);
    guard += 1;
  }
  return { fg, bg };
};
