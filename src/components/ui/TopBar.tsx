import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { useActivityCount } from '../../hooks/useActivityCount';
import { useCoachmarkTarget } from '../coachmarks/CoachmarkProvider';

interface TopBarProps {
  /** Convenience left content. Ignored when `children` is provided. */
  title?: string;
  /** Custom left slot (greeting block, title + subtitle, etc.). */
  children?: ReactNode;
  /**
   * Visual tone for the bell. `'default'` sits on a light surface (bare
   * glyph, `text.secondary`). `'hero'` sits on the Dashboard's navy gradient
   * band (DESIGN.md Dashboard A3): a translucent white circle behind the
   * glyph, `text.onBrand` color. The bell and its unread badge keep
   * identical size/position across both tones — only color/background
   * changes — so the control never visually "nudges" between screens.
   */
  variant?: 'default' | 'hero';
  /**
   * Optional content rendered *before* the bell (e.g. Dashboard's profile
   * avatar). The bell stays rightmost — it is the global element; the avatar is
   * an account control that sits to its left (DESIGN.md bell placement).
   */
  leading?: ReactNode;
  /** Optional content rendered after the bell. */
  trailing?: ReactNode;
}

/**
 * Shared screen header: a flexible left slot (title or custom node) and a
 * right-side bell that opens the merged Activity screen with a combined
 * unread-notifications + pending-invitations badge. Adopted by every student
 * tab screen — including the Dashboard hero via `variant="hero"` — so the
 * bell lives in one consistent place with one consistent look.
 */
export const TopBar = ({ title, children, variant = 'default', leading, trailing }: TopBarProps) => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const count = useActivityCount();
  const isHero = variant === 'hero';
  // First-run coachmark target (#69): the bell is the sequence's first stop.
  const bellCoachmarkRef = useCoachmarkTarget('bell');

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {children ?? <Text style={styles.title}>{title}</Text>}
      </View>
      <View style={styles.actions}>
        {leading}
        <Pressable
          ref={bellCoachmarkRef}
          onPress={() => navigation.navigate('Activity')}
          style={({ pressed }) => [
            styles.bell,
            isHero ? styles.bellHero : styles.bellDefault,
            pressed && styles.bellPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Activity"
          hitSlop={8}
        >
          <Ionicons
            name="notifications-outline"
            size={22}
            color={isHero ? theme.colors.text.onBrand : theme.colors.text.secondary}
          />
          {count > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
            </View>
          ) : null}
        </Pressable>
        {trailing}
      </View>
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: t.spacing.md,
    },
    left: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      // Screen-title role: the single "display" heading token, so every screen
      // header (and ResearchDetail's own title) reads at one size instead of an
      // off-scale 26.
      ...t.typography.display,
      color: t.colors.text.primary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
    },
    bell: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
    },
    bellHero: {
      backgroundColor: 'rgba(255, 255, 255, 0.14)',
    },
    // Light-surface twin of bellHero: a subtle sunken circle so the bell reads
    // as the same control on every screen, not a bare glyph on some and a
    // circle on others (consistent notification placement — DESIGN.md).
    bellDefault: {
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
