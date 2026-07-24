/**
 * NUcleus motion tokens.
 *
 * Original Phase 1 tokens (skeleton + list entrance) are preserved for existing
 * consumers (Skeleton, ListEntranceItem). The UX remodel adds a fuller system:
 * durations, reanimated spring presets, press feedback, and entrance config.
 * Spring presets are plain configs consumable by reanimated `withSpring`.
 */
export const motion = {
  // — original (do not change; consumed by Skeleton / ListEntranceItem) —
  skeletonCycleDuration: 900,
  listItemDuration: 320,
  listStaggerDelay: 60,

  // — durations (ms) —
  duration: {
    fast: 150,
    base: 240,
    slow: 360,
    sheet: 320,
    sheetClose: 260,
    nav: 420,
  },

  // — easing / curves —
  easing: {
    navSpring: [0.34, 1.3, 0.4, 1], // cubic-bezier for signature selection pill
  },

  // — reanimated withSpring presets —
  spring: {
    press: { damping: 18, stiffness: 280, mass: 0.6 },
    gentle: { damping: 20, stiffness: 180, mass: 1 },
    sheet: { damping: 24, stiffness: 240, mass: 0.9 },
    // Lively overshoot for a confirming "pop" (e.g. the save/bookmark toggle):
    // low damping so it springs past 1 and settles back.
    pop: { damping: 9, stiffness: 340, mass: 0.6 },
  },

  // — interaction —
  pressScale: 0.97,

  // — list / element entrance —
  entrance: {
    distance: 8,
    duration: 320,
    stagger: 60,
  },
} as const;

export type Motion = typeof motion;
