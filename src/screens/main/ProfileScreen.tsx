import { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { PressableScale, Screen } from '../../components/ui';

const initialsFor = (fullName?: string | null) => {
  const name = fullName?.trim();
  if (!name) return '?';
  const parts = name.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

type SettingsRowTrailing = 'chevron' | 'toggle';

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  divided?: boolean;
  trailing?: SettingsRowTrailing;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/**
 * A single Profile (A3) settings row: `primary-surface` icon tile, label +
 * optional subtitle, and a trailing chevron or (non-functional) toggle. Only
 * rows with a real `onPress` (Sign out) are pressable — Recovery email and
 * Password have no destination screen yet, so they stay informational,
 * matching the app's existing convention for not-yet-wired settings entries.
 */
const SettingsRow = ({
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
        <Ionicons name={icon} size={18} color={theme.colors.brand.primary} />
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
        <Ionicons name="chevron-forward" size={18} color={theme.colors.text.disabled} />
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

export const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);

  const initials = useMemo(() => initialsFor(user?.fullName), [user?.fullName]);

  const handle = useMemo(() => {
    const parts = [user?.email ? user.email.split('@')[0] : null, user?.program].filter(
      (part): part is string => !!part
    );
    return parts.join(' · ');
  }, [user?.email, user?.program]);

  return (
    // Top edge intentionally opted out of Screen's own inset padding: the navy
    // banner below is meant to bleed under the status bar, so its safe-area
    // clearance is applied to the banner itself (not to Screen's outer box).
    // Bottom edge is opted out too — the floating tab bar already owns it.
    <Screen gutter={0} edges={{ top: false, bottom: false }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.banner, { height: 120 + insets.top }]}>
        <Text style={styles.watermark}>N</Text>
      </View>

      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName || 'Student'}</Text>
        {handle ? <Text style={styles.handle}>{handle}</Text> : null}
      </View>

      <View style={styles.rowsSection}>
        <SettingsRow
          icon="mail-outline"
          label="Recovery email"
          subtitle="Add a personal email for password reset"
          trailing="chevron"
        />
        <SettingsRow
          icon="lock-closed-outline"
          label="Password"
          subtitle="Change your password"
          divided
          trailing="chevron"
        />
        <SettingsRow
          icon="moon-outline"
          label="Dark mode"
          subtitle="Match system appearance"
          divided
          trailing="toggle"
        />
        <SettingsRow
          icon="log-out-outline"
          label="Sign out"
          divided
          onPress={signOut}
          accessibilityLabel="Sign out"
        />
      </View>
      </ScrollView>
    </Screen>
  );
};

const monoFontFamily = Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' });

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingBottom: t.spacing['3xl'] + 56,
    },
    banner: {
      backgroundColor: t.colors.brand.primary,
      borderBottomLeftRadius: 26,
      borderBottomRightRadius: 26,
      borderCurve: 'continuous',
      overflow: 'hidden',
    },
    watermark: {
      position: 'absolute',
      right: t.spacing.lg,
      bottom: -14,
      fontFamily: monoFontFamily,
      fontWeight: '800',
      fontSize: 96,
      lineHeight: 96,
      letterSpacing: -6,
      color: 'rgba(255, 255, 255, 0.06)',
    },
    avatarWrap: {
      alignItems: 'center',
    },
    avatar: {
      width: 82,
      height: 82,
      borderRadius: 24,
      borderCurve: 'continuous',
      backgroundColor: t.colors.brand.accent,
      borderWidth: 4,
      borderColor: t.colors.surface.base,
      marginTop: -42,
      alignItems: 'center',
      justifyContent: 'center',
      ...t.shadows.level1,
    },
    avatarText: {
      fontFamily: t.fontFamilies.ui.bold,
      fontSize: 28,
      color: t.colors.text.onAccent,
    },
    name: {
      fontFamily: t.typography.h2.fontFamily,
      fontWeight: t.typography.h2.fontWeight,
      fontSize: t.typography.h2.fontSize,
      lineHeight: t.typography.h2.lineHeight,
      color: t.colors.text.primary,
      textAlign: 'center',
      marginTop: t.spacing.sm,
    },
    handle: {
      fontFamily: t.typography.metadata.fontFamily,
      fontWeight: t.typography.metadata.fontWeight,
      fontSize: t.typography.metadata.fontSize,
      lineHeight: t.typography.metadata.lineHeight,
      color: t.colors.text.muted,
      textAlign: 'center',
      marginTop: t.spacing.xs,
    },
    rowsSection: {
      marginTop: t.spacing.xl,
      paddingHorizontal: t.spacing.lg,
    },
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
      backgroundColor: t.colors.border.subtle,
      justifyContent: 'center',
      padding: 3,
    },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.surface.raised,
      ...t.shadows.level1,
    },
  });
