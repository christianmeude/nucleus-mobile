import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Icon } from './Icon';

interface FilterTriggerProps {
  /** Group name shown on the trigger (e.g. "Filters" or "Status"). */
  label: string;
  /** Navy-fill treatment when a non-default selection is active. */
  active: boolean;
  onPress: () => void;
  /** Status-style adaptive label — the current value alone (e.g. "In Review").
   * The value itself is the indication; no group prefix is shown. */
  valueText?: string;
  /** Browse-style count badge. Omitted when zero/undefined. */
  badgeCount?: number;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

/**
 * Single canonical filter trigger pill shared by Browse, My Papers, and
 * Review Queue. One row beside the search field: leading sliders icon plus
 * an adaptive label — count badge for multi-facet filters, value text for
 * single-select status filters. Navy-fill active treatment per the
 * Active-Fill Rule. Plain Pressable (not PressableScale) so it stays
 * queryable under jest, where reanimated nodes are unavailable.
 */
export function FilterTrigger({
  label,
  active,
  onPress,
  valueText,
  badgeCount = 0,
  accessibilityLabel,
  accessibilityHint,
}: FilterTriggerProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const text = valueText ?? label;

  return (
    <Pressable
      style={({ pressed }) => [styles.trigger, active && styles.triggerActive, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <Icon
        icon={SlidersHorizontal}
        size={18}
        color={active ? theme.colors.text.onBrand : theme.colors.text.secondary}
      />
      <Text
        style={[styles.triggerText, active && styles.triggerTextActive]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {text}
      </Text>
      {badgeCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.pill,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderColor: theme.colors.border.strong,
      backgroundColor: theme.colors.surface.raised,
      flexShrink: 0,
      maxWidth: 200,
    },
    triggerActive: {
      backgroundColor: theme.colors.brand.primary,
      borderColor: theme.colors.brand.primary,
    },
    triggerText: {
      ...theme.typography.label,
      color: theme.colors.text.secondary,
      flexShrink: 1,
    },
    triggerTextActive: {
      color: theme.colors.text.onBrand,
    },
    badge: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      borderRadius: theme.radii.pill,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.text.onBrand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      fontFamily: theme.fontFamilies.ui.semibold,
      fontSize: 12,
      lineHeight: 16,
      color: theme.colors.brand.primary,
      fontVariant: ['tabular-nums'],
    },
    pressed: {
      opacity: 0.85,
    },
  });
