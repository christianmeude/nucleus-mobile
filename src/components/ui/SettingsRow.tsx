import { StyleSheet, Text, View } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { PressableScale } from './motion/PressableScale';
import { Icon } from './Icon';

type SettingsRowTrailing = 'chevron' | 'toggle';

interface SettingsRowProps {
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  divided?: boolean;
  trailing?: SettingsRowTrailing;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/**
 * A single Profile settings row (DESIGN.md Profile A3): `primary-surface` icon
 * tile, label + optional subtitle, and a trailing chevron or (non-functional)
 * toggle. Shared by the student and faculty Profile screens. Only rows with a
 * real `onPress` are pressable; informational rows stay static, matching the
 * app's convention for not-yet-wired entries.
 */
export const SettingsRow = ({
  icon,
  label,
  subtitle,
  divided,
  trailing,
  onPress,
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
        <View
          style={styles.toggleTrack}
          accessibilityRole="switch"
          accessibilityState={{ disabled: true, checked: false }}
          accessibilityLabel="Dark mode (not yet available)"
        >
          <View style={styles.toggleThumb} />
        </View>
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
    toggleTrack: {
      width: 44,
      height: 26,
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
      backgroundColor: t.colors.border.subtle,
      justifyContent: 'center',
      padding: 3,
    },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
      backgroundColor: t.colors.surface.raised,
      ...t.shadows.level1,
    },
  });
