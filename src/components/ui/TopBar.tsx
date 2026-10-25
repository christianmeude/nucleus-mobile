import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Icon } from './Icon';
import { useActivityCount } from '../../hooks/useActivityCount';
import { Bell } from 'lucide-react-native';

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
 * unread-notifications + pending-invitations badge. The Dashboard hero uses
 * `tone="hero"`; every other screen hides the bell so it appears on the
 * Dashboard only.
 */
export const TopBar = ({
  title,
  children,
  tone = 'default',
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

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {leftAccessory}
        {children ?? <Text style={styles.title}>{title}</Text>}
      </View>
      <View style={styles.actions} pointerEvents="box-none">
        {leading}
        {!hideBell && (
          <Pressable
            onPress={() => navigation.navigate('Activity')}
            style={({ pressed }) => [
              styles.bell,
              isHero && styles.bellHero,
              pressed && styles.bellPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Activity"
            hitSlop={16}
          >
            <Icon
              icon={Bell}
              size={24}
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
      position: 'relative',
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
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: t.spacing.sm,
      flexShrink: 0,
    },
    bell: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
      backgroundColor: t.colors.surface.sunken,
    },
    bellHero: {
      backgroundColor: 'rgba(255,255,255,.14)',
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
