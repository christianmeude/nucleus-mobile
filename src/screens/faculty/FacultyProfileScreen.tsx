import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { formatMonthYear } from '../../utils/format';
import { theme } from '../../theme';

const initialsFor = (fullName?: string | null) => {
  const name = fullName?.trim();
  if (!name) return '?';
  const parts = name.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

type InfoRowProps = {
  label: string;
  value: string;
  divided?: boolean;
  gold?: boolean;
  selectable?: boolean;
};

const InfoRow = ({ label, value, divided, gold, selectable }: InfoRowProps) => (
  <View style={[styles.infoRow, divided && styles.rowDivided]}>
    <Text style={styles.infoKey}>{label}</Text>
    <View style={styles.infoValWrap}>
      {gold ? <View style={styles.goldDot} /> : null}
      <Text style={styles.infoVal} selectable={selectable}>
        {value}
      </Text>
    </View>
  </View>
);

export const FacultyProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const initials = useMemo(() => initialsFor(user?.fullName), [user?.fullName]);
  const roleLabel = useMemo(() => {
    if (!user?.role) return '';
    return user.role.charAt(0).toUpperCase() + user.role.slice(1);
  }, [user?.role]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.band, { paddingTop: insets.top + theme.spacing.xl }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName || 'Faculty'}</Text>
        {roleLabel ? (
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{roleLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <InfoRow label="Email" value={user?.email || '—'} selectable />
          <InfoRow label="Department" value={user?.department || '—'} divided />
          <InfoRow label="Program" value={user?.program || '—'} divided />
          <InfoRow label="Member since" value={formatMonthYear(user?.createdAt)} divided gold />
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.signout, pressed && styles.signoutPressed]}
        onPress={signOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Text style={styles.signoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface.base,
  },
  content: {
    paddingBottom: theme.spacing['3xl'],
  },
  band: {
    backgroundColor: theme.colors.brand.primarySurface,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: theme.radii.pill,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.level1,
  },
  avatarText: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 27,
    color: theme.colors.text.onBrand,
  },
  name: {
    fontFamily: theme.fontFamilies.display.semibold,
    fontSize: 23,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  rolePill: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.brand.primarySoft,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  rolePillText: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.brand.primary,
  },
  section: {
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: theme.colors.text.disabled,
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radii.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: theme.spacing.lg,
  },
  rowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border.subtle,
  },
  infoKey: {
    fontFamily: theme.fontFamilies.ui.regular,
    fontSize: 14,
    color: theme.colors.text.muted,
  },
  infoValWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 1,
    justifyContent: 'flex-end',
    marginLeft: theme.spacing.md,
  },
  infoVal: {
    fontFamily: theme.fontFamilies.ui.medium,
    fontSize: 14,
    color: theme.colors.text.primary,
    textAlign: 'right',
    flexShrink: 1,
  },
  goldDot: {
    width: 7,
    height: 7,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.brand.accent,
  },
  signout: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginTop: theme.spacing.sm,
  },
  signoutPressed: {
    opacity: 0.6,
  },
  signoutText: {
    fontFamily: theme.fontFamilies.ui.medium,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
});
