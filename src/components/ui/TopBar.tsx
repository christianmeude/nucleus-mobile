import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { useActivityCount } from '../../hooks/useActivityCount';

interface TopBarProps {
  /** Convenience left content. Ignored when `children` is provided. */
  title?: string;
  /** Custom left slot (greeting block, title + subtitle, etc.). */
  children?: ReactNode;
}

/**
 * Shared screen header: a flexible left slot (title or custom node) and a
 * right-side bell that opens the merged Activity screen with a combined
 * unread-notifications + pending-invitations badge. Adopted by every student
 * tab screen so the bell lives in one consistent place.
 */
export const TopBar = ({ title, children }: TopBarProps) => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const count = useActivityCount();

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {children ?? <Text style={styles.title}>{title}</Text>}
      </View>
      <Pressable
        onPress={() => navigation.navigate('Activity')}
        style={({ pressed }) => [styles.bell, pressed && styles.bellPressed]}
        accessibilityRole="button"
        accessibilityLabel="Activity"
        hitSlop={8}
      >
        <Ionicons
          name="notifications-outline"
          size={22}
          color={theme.colors.text.secondary}
        />
        {count > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
          </View>
        ) : null}
      </Pressable>
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
      fontFamily: t.fontFamilies.display.semibold,
      fontSize: 26,
      lineHeight: 32,
      color: t.colors.text.primary,
    },
    bell: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
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
