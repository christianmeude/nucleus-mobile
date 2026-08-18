import { StyleSheet, Switch, Text, View } from 'react-native';
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
        <Switch
          value={value}
          onValueChange={onValueChange}
          accessibilityRole="switch"
          accessibilityState={{ checked: value }}
          accessibilityLabel={accessibilityLabel ?? label}
          trackColor={{ false: theme.colors.border.strong, true: theme.colors.brand.primary }}
          thumbColor={theme.colors.surface.raised}
        />
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
  });
