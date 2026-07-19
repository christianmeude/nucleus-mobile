import { palette, schemes } from './colors';

/**
 * NUcleus gradient presets.
 */
export const gradients = {
  /** Navy hero header gradient */
  hero: {
    colors: [schemes.light.brand.primary, schemes.light.brand.primaryHover],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  /** Submit FAB top-lit gold gradient */
  fab: {
    colors: [palette.gold[200], palette.gold[500]],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
} as const;

export type Gradients = typeof gradients;
export type GradientKey = keyof Gradients;
