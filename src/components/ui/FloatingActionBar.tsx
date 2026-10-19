import { ReactNode, useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

interface FloatingActionBarProps {
  /** The action(s) — typically one `size="lg"` Button, or a short row of two. */
  children: ReactNode;
  /**
   * Gap above the home indicator. Defaults to `md`, matching the nav bar's
   * resting offset so a CTA and the nav bar sit on the same line.
   */
  offset?: number;
  /** Lay the actions side by side; weights come from each action's `style.flex`. */
  row?: boolean;
}

/**
 * A detached action bar pinned above the bottom safe area — the reader's
 * "View Full Paper" and the submit flow's step controls are its callers.
 *
 * It exists to kill the copied "bordered footer slab" pattern (a full-width
 * View with a `border-top` hairline and a flat pill inside) that made CTAs read
 * as chrome attached to the screen edge rather than an action floating over the
 * page. The geometry mirrors the nav bar (SCREENS.md §A1): `lg` side insets,
 * `md` off the safe area.
 *
 * Render it as a sibling of the scrolling content — *not* inside it — so its
 * bottom offset is measured against the screen rather than the screen's
 * safe-area padding. The action itself carries the elevation (`elevated` on
 * `Button`), so a bar of two actions doesn't double up shadows on one slab.
 *
 * It lifts itself over the software keyboard. It has to: the bar is absolutely
 * positioned and absolute children ignore their parent's padding, so
 * `KeyboardAvoidingView`'s bottom padding never moves it. Only iOS needs the
 * lift — Android resizes the window by default, so an absolute-bottom bar
 * already clears the keyboard there.
 */
export const FloatingActionBar = ({ children, offset, row = false }: FloatingActionBarProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => setKeyboardHeight(event.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const gap = offset ?? theme.spacing.md;
  // While the keyboard is up on iOS it covers the home indicator, so its height
  // replaces the safe-area inset rather than adding to it.
  const bottom =
    Platform.OS === 'ios' && keyboardHeight > 0 ? keyboardHeight + gap : insets.bottom + gap;

  return <View style={[styles.bar, row && styles.row, { bottom }]}>{children}</View>;
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    bar: {
      position: 'absolute',
      left: t.spacing.lg,
      right: t.spacing.lg,
      zIndex: 10,
      gap: t.spacing.md,
    },
    row: {
      flexDirection: 'row',
    },
  });
