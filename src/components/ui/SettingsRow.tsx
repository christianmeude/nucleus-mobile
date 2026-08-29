import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { PressableScale } from './motion/PressableScale';
import { Icon } from './Icon';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type SettingsRowTrailing = 'chevron' | 'toggle';

interface SettingsRowProps {
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  divided?: boolean;
  trailing?: SettingsRowTrailing;
  onPress?: () => void;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  accessibilityLabel?: string;
}

/**
 * A single Profile settings row (DESIGN.md Profile A3): `primary-surface` icon
 * tile, label + optional subtitle, and a trailing chevron or native toggle.
 * Shared by the student and faculty Profile screens.
 */
export const SettingsRow = ({
  icon,
  label,
  subtitle,
  divided,
  trailing,
  onPress,
  value = false,
  onValueChange,
  accessibilityLabel,
}: SettingsRowProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const content = (
    <View style={[styles.row, divided && styles.rowDivided]}>
      <View style={styles.iconTile}>
        <Icon icon={icon} size={18} color={theme.colors.brand.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing === 'chevron' ? (
        <Icon icon={ChevronRight} size={18} color={theme.colors.text.disabled} />
      ) : trailing === 'toggle' ? (
        <ReanimatedToggle value={value} onValueChange={onValueChange} accessibilityLabel={accessibilityLabel ?? label} />
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {content}
    </PressableScale>
  );
};

const ReanimatedToggle = ({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange?: (v: boolean) => void;
  accessibilityLabel: string;
}) => {
  const { theme } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, { damping: 18, stiffness: 260 });
  }, [value]);
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 16 }],
  }));
  const trackStyle = {
    backgroundColor: value ? theme.colors.brand.primary : theme.colors.border.strong,
  };
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onValueChange?.(!value);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={[toggleStyles.track, trackStyle]}
    >
      <Animated.View style={[toggleStyles.thumb, { backgroundColor: theme.colors.surface.raised }, thumbStyle]} />
    </Pressable>
  );
};

const toggleStyles = StyleSheet.create({
  track: {
    width: 44,
    height: 28,
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 4,
    justifyContent: 'center',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
});

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.md,
      paddingVertical: t.spacing.lg,
    },
    rowDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.colors.border.subtle,
    },
    iconTile: {
      width: 36,
      height: 36,
      borderRadius: t.radii.md,
      borderCurve: 'continuous',
      backgroundColor: t.colors.brand.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
      minWidth: 0,
    },
    rowLabel: {
      fontFamily: t.typography.bodyStrong.fontFamily,
      fontWeight: t.typography.bodyStrong.fontWeight,
      fontSize: t.typography.bodyStrong.fontSize,
      lineHeight: t.typography.bodyStrong.lineHeight,
      color: t.colors.text.primary,
    },
    rowSubtitle: {
      fontFamily: t.typography.caption.fontFamily,
      fontWeight: t.typography.caption.fontWeight,
      fontSize: t.typography.caption.fontSize,
      lineHeight: t.typography.caption.lineHeight,
      color: t.colors.text.muted,
      marginTop: t.spacing.xs,
    },
  });
