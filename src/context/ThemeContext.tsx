import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, type SchemeName, type Theme } from '../theme';
import { flags } from '../config/flags';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'nucleus.theme.preference';

interface ThemeContextValue {
  /** Full theme object for the active scheme. */
  theme: Theme;
  /** Resolved active scheme, after preference + flag gate. */
  scheme: SchemeName;
  /** User preference (may be 'system'); persisted across launches. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isPreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

/** Collapse the OS appearance (which may be null/undefined) to a scheme. */
const normalizeScheme = (value: string | null | undefined): SchemeName =>
  value === 'dark' ? 'dark' : 'light';

/**
 * Resolve the active scheme. The `darkMode` flag is the hard gate: while it is
 * off the app is always light, regardless of OS appearance or stored
 * preference — this is what guarantees no half-dark UI ships mid-migration.
 */
const resolveScheme = (
  preference: ThemePreference,
  systemScheme: SchemeName,
): SchemeName => {
  if (!flags.darkMode) return 'light';
  if (preference === 'system') return systemScheme;
  return preference;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<SchemeName>(() =>
    normalizeScheme(Appearance.getColorScheme()),
  );

  // Hydrate the persisted preference once on mount.
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && isPreference(stored)) setPreferenceState(stored);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Follow OS appearance changes (used when preference === 'system').
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) =>
      setSystemScheme(normalizeScheme(colorScheme)),
    );
    return () => sub.remove();
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const scheme = resolveScheme(preference, systemScheme);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: themes[scheme], scheme, preference, setPreference }),
    [scheme, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
};

/**
 * Build a memoized StyleSheet from the active theme. `factory` must be a stable
 * module-scope function (define it outside the component, exactly like the old
 * `StyleSheet.create`). The sheet is rebuilt only when the active scheme
 * changes — not on every render — so a migrated screen keeps the same cost as
 * the previous module-scope `StyleSheet.create`.
 *
 *   const makeStyles = (t: Theme) =>
 *     StyleSheet.create({ card: { backgroundColor: t.colors.surface.raised } });
 *   const styles = useThemedStyles(makeStyles);
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): T {
  const { theme, scheme } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- theme is stable per scheme; rebuild only when scheme changes
  return useMemo(() => factory(theme), [scheme]);
}
