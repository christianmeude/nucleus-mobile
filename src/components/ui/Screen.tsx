import { ReactNode } from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView. Default false. */
  scroll?: boolean;
  /** Horizontal gutter (px). Default 20 — roomier than the legacy 16. */
  gutter?: number;
  /** Apply safe-area insets per edge. Both default on. */
  edges?: { top?: boolean; bottom?: boolean };
  /** Themed background. Default the base app surface. */
  background?: 'base' | 'raised';
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

const DEFAULT_GUTTER = 20;

/**
 * Standard screen frame: themed background + safe-area insets + a consistent
 * horizontal gutter, so screens stop rolling their own `useSafeAreaInsets` and
 * stop crowding the phone edges. Consumes `useTheme`, so it must render inside
 * `ThemeProvider` (mounted at the app root).
 */
export const Screen = ({
  children,
  scroll = false,
  gutter = DEFAULT_GUTTER,
  edges,
  background = 'base',
  style,
  contentContainerStyle,
}: ScreenProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const backgroundColor =
    background === 'raised' ? theme.colors.surface.raised : theme.colors.surface.base;

  const padding: ViewStyle = {
    paddingHorizontal: gutter,
    paddingTop: edges?.top === false ? 0 : insets.top,
    paddingBottom: edges?.bottom === false ? 0 : insets.bottom,
  };

  if (scroll) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        style={[styles.flex, { backgroundColor }, style]}
        contentContainerStyle={[padding, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[styles.flex, { backgroundColor }, padding, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
