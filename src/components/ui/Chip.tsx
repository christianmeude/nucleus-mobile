import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

type ChipTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
type ChipVariant = 'filter' | 'status';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  active?: boolean;
  tone?: ChipTone;
  onPress?: () => void;
}

export const Chip = ({
  label,
  variant = 'filter',
  active = false,
  tone = 'neutral',
  onPress,
}: ChipProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  if (variant === 'status') {
    const toneMap: Record<ChipTone, { bg: string; border: string; text: string }> = {
      neutral: {
        bg: theme.colors.surface.raised,
        border: theme.colors.border.strong,
        text: theme.colors.text.secondary,
      },
      info: {
        bg: theme.colors.brand.primarySoft,
        border: theme.colors.brand.primary,
        text: theme.colors.brand.primary,
      },
      success: {
        bg: theme.colors.state.successSurface,
        border: theme.colors.state.success,
        text: theme.colors.state.success,
      },
      warning: {
        bg: theme.colors.state.warningSurface,
        border: theme.colors.state.warning,
        text: theme.colors.state.warning,
      },
      danger: {
        bg: theme.colors.state.dangerSurface,
        border: theme.colors.state.danger,
        text: theme.colors.state.danger,
      },
    };
    const t = toneMap[tone];
    return (
      <View style={[styles.base, { backgroundColor: t.bg, borderColor: t.border }]}>
        <Text style={[styles.label, { color: t.text }]}>{label}</Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.base,
        active ? styles.filterActive : styles.filterInactive,
        pressed ? styles.pressed : null,
        pressed ? styles.pressedScale : null,
      ]}
    >
      <Text style={[styles.label, active ? styles.filterActiveLabel : styles.filterInactiveLabel]}>
        {label}
      </Text>
    </Pressable>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    base: {
      borderRadius: t.radii.pill,
      borderWidth: 1,
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterInactive: {
      backgroundColor: t.colors.surface.raised,
      borderColor: t.colors.border.strong,
    },
    filterActive: {
      backgroundColor: t.colors.brand.primary,
      borderColor: t.colors.brand.primary,
    },
    filterInactiveLabel: {
      color: t.colors.text.secondary,
    },
    filterActiveLabel: {
      color: t.colors.text.onBrand,
    },
    label: {
      ...t.typography.label,
    },
    pressed: {
      opacity: 0.9,
    },
    pressedScale: {
      transform: [{ scale: 0.98 }],
    },
  });

export type { ChipTone };
