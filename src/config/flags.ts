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
} as const;

export type Flags = typeof flags;
export type FlagKey = keyof Flags;
