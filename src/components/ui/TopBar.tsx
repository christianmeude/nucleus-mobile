import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Icon } from './Icon';
import { useActivityCount } from '../../hooks/useActivityCount';
import { useCoachmarkTarget } from '../coachmarks/CoachmarkProvider';

import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
  useReducedMotion,
} from 'react-native-reanimated';

interface TopBarProps {
  /** Convenience left content. Ignored when `children` is provided. */
  title?: string;
  /** Custom left slot (greeting block, title + subtitle, etc.). */
  children?: ReactNode;
  /**
   * Visual tone for the bell icon color and optional other elements.
   * 'hero' is used on the Dashboard's navy gradient band.
   */
  tone?: 'default' | 'hero';
  /**
   * Title size behavior. 'large' uses h1 size (24px) and shrinks to h3 (17px)
   * if `scrollOffset` is provided. 'compact' is a static h3.
   */
  variant?: 'large' | 'compact';
  /** Shared value from a scrollable component to drive the large title collapse. */
  scrollOffset?: SharedValue<number>;
  /** Optional accessory rendered to the left of the title (e.g., a back button). */
  leftAccessory?: ReactNode;
  /** Optional content rendered *before* the bell. */
  leading?: ReactNode;
  /** Optional content rendered after the bell. */
  trailing?: ReactNode;
  /** If true, the default bell button is omitted. */
  hideBell?: boolean;
}

/**
 * Shared screen header: a flexible left slot (title or custom node) and a
 * right-side bell that opens the merged Activity screen with a combined
 * unread-notifications + pending-invitations badge. Adopted by every student
 * tab screen — including the Dashboard hero via `variant="hero"` — so the
 * bell lives in one consistent place with one consistent look.
 */
export const TopBar = ({
  title,
  children,
  tone = 'default',
  variant = 'compact',
  scrollOffset,
  leftAccessory,
  leading,
  trailing,
  hideBell,
}: TopBarProps) => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const count = useActivityCount();
  const isHero = tone === 'hero';
  const isLarge = variant === 'large';
  const reduceMotion = useReducedMotion();
  
  const bellCoachmarkRef = useCoachmarkTarget('bell');

  const titleAnimatedStyle = useAnimatedStyle(() => {
    if (!isLarge || !scrollOffset || reduceMotion) return {};
    return {
      fontSize: interpolate(
        scrollOffset.value,
        [0, 60],
        [theme.typography.h1.fontSize, theme.typography.h3.fontSize],
        Extrapolation.CLAMP
      ),
      lineHeight: interpolate(
        scrollOffset.value,
        [0, 60],
        [theme.typography.h1.lineHeight, theme.typography.h3.lineHeight],
        Extrapolation.CLAMP
      ),
    };
  });

  return (
    <View style={[styles.row, isLarge && styles.rowLarge]}>
      <View style={styles.left}>
        {leftAccessory}
        {children ?? (
          <Animated.Text style={[isLarge ? styles.titleLarge : styles.title, titleAnimatedStyle]}>
            {title}
          </Animated.Text>
        )}
      </View>
      <View style={styles.actions}>
        {leading}
        {!hideBell && (
          <Pressable
            ref={bellCoachmarkRef}
            onPress={() => navigation.navigate('Activity')}
            style={({ pressed }) => [
              styles.bell,
              pressed && styles.bellPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Activity"
            hitSlop={8}
          >
            <Icon
              icon={Bell}
              size={20}
              color={isHero ? theme.colors.text.onBrand : theme.colors.text.secondary}
            />
            {count > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
              </View>
            ) : null}
          </Pressable>
        )}
        {trailing}
      </View>
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.spacing.md,
      minHeight: 44,
    },
    rowLarge: {
      alignItems: 'flex-start',
    },
    left: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
      justifyContent: 'flex-start',
      minHeight: 44,
    },
    title: {
      ...t.typography.h3,
      color: t.colors.text.primary,
    },
    titleLarge: {
      ...t.typography.h1,
      color: t.colors.text.primary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
    },
    bell: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
      backgroundColor: t.colors.surface.sunken,
    },
    bellPressed: {
      opacity: 0.6,
    },
    badge: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brand.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 10,
      lineHeight: 14,
      color: t.colors.text.onBrand,
      fontVariant: ['tabular-nums'],
    },
  });
