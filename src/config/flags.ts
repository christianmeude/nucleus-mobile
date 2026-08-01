/**
 * Feature flags — named booleans checked at the point a feature renders or
 * executes. Default off until Christian flips them on (CONVENTIONS §1).
 *
 * `darkMode` gates the runtime dark theme. It stays off until every reachable
 * screen is migrated to the theme system (A0 fan-out) and the frozen surfaces
 * (`AppNavigator` in A1, `SubmitResearchScreen`) get a dark pass — so no
 * half-dark UI ever ships. While it is false the `ThemeProvider` forces the
 * light scheme regardless of OS appearance or stored preference.
 */
export const flags = {
  darkMode: false,

  /**
   * `hybridSearch` gates Browse's server-side hybrid search (Issue #29): a
   * non-empty query hits the `search-papers` Edge Function (full-text + pgvector
   * RRF) instead of the local substring filter. Stays off until the embedding
   * backfill (`embed-papers`) has run and search is QA'd end-to-end; while false,
   * Browse keeps its existing on-device filtering.
   */
  hybridSearch: true,
} as const;

export type Flags = typeof flags;
export type FlagKey = keyof Flags;
