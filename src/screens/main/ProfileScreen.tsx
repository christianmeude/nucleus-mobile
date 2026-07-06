import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { researchApi } from '../../api/research';
import { getSavedPaperIds } from '../../api/collections';
import { formatMonthYear } from '../../utils/format';
import { type Theme } from '../../theme';
import { TopBar } from '../../components/ui';

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

const InfoRow = ({ label, value, divided, gold, selectable }: InfoRowProps) => {
  const styles = useThemedStyles(makeStyles);
  return (
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
};

const PrefRow = ({ label, divided }: { label: string; divided?: boolean }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.prefRow, divided && styles.rowDivided]}>
      <Text style={styles.prefLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.text.disabled} />
    </View>
  );
};

export const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const [paperCount, setPaperCount] = useState<number | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    const [papersResult, savedResult] = await Promise.allSettled([
      researchApi.getMyPapers(),
      getSavedPaperIds(),
    ]);
    setPaperCount(papersResult.status === 'fulfilled' ? papersResult.value.length : 0);
    setSavedCount(savedResult.status === 'fulfilled' ? savedResult.value.length : 0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const initials = useMemo(() => initialsFor(user?.fullName), [user?.fullName]);
  const roleLabel = useMemo(() => {
    if (!user?.role) return '';
    return user.role.charAt(0).toUpperCase() + user.role.slice(1);
  }, [user?.role]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + theme.spacing.sm }]}>
        <TopBar title="Profile" />
      </View>

      <View style={styles.band}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName || 'Student'}</Text>
        {roleLabel ? (
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{roleLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{paperCount ?? '—'}</Text>
          <Text style={styles.statLabel}>Papers</Text>
        </View>
        <View style={[styles.stat, styles.statDivider]}>
          <Text style={styles.statNum}>{savedCount ?? '—'}</Text>
          <Text style={styles.statLabel}>Saved</Text>
        </View>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App preferences</Text>
        <View style={styles.card}>
          <PrefRow label="Notifications" />
          <PrefRow label="Appearance" divided />
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

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.surface.base,
    },
    content: {
      paddingBottom: t.spacing['3xl'],
    },
    topBar: {
      paddingHorizontal: t.spacing.lg,
      paddingBottom: t.spacing.md,
    },
    band: {
      backgroundColor: t.colors.brand.primarySurface,
      paddingVertical: t.spacing.xl,
      paddingHorizontal: t.spacing.xl,
      alignItems: 'center',
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
      backgroundColor: t.colors.brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...t.shadows.level1,
    },
    avatarText: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 27,
      color: t.colors.text.onBrand,
    },
    name: {
      fontFamily: t.fontFamilies.display.semibold,
      fontSize: 23,
      color: t.colors.text.primary,
      marginTop: t.spacing.md,
    },
    rolePill: {
      marginTop: t.spacing.sm,
      backgroundColor: t.colors.surface.raised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.brand.primarySoft,
      borderRadius: t.radii.pill,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.xs,
    },
    rolePillText: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: t.colors.brand.primary,
    },
    stats: {
      flexDirection: 'row',
      marginHorizontal: t.spacing.xl,
      marginTop: -t.spacing.lg,
      backgroundColor: t.colors.surface.raised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      ...t.shadows.level1,
    },
    stat: {
      flex: 1,
      paddingVertical: t.spacing.md,
      alignItems: 'center',
    },
    statDivider: {
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: t.colors.border.subtle,
    },
    statNum: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 22,
      color: t.colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    statLabel: {
      fontFamily: t.fontFamilies.ui.medium,
      fontSize: 12,
      color: t.colors.text.muted,
      marginTop: 2,
    },
    section: {
      marginHorizontal: t.spacing.xl,
      marginTop: t.spacing.xl,
    },
    sectionTitle: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 12,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
      color: t.colors.text.disabled,
      marginBottom: t.spacing.sm,
    },
    card: {
      backgroundColor: t.colors.surface.raised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      overflow: 'hidden',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 13,
      paddingHorizontal: t.spacing.lg,
    },
    rowDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.colors.border.subtle,
    },
    infoKey: {
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 14,
      color: t.colors.text.muted,
    },
    infoValWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      flexShrink: 1,
      justifyContent: 'flex-end',
      marginLeft: t.spacing.md,
    },
    infoVal: {
      fontFamily: t.fontFamilies.ui.medium,
      fontSize: 14,
      color: t.colors.text.primary,
      textAlign: 'right',
      flexShrink: 1,
    },
    goldDot: {
      width: 7,
      height: 7,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brand.accent,
    },
    prefRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: t.spacing.lg,
    },
    prefLabel: {
      flex: 1,
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 14,
      color: t.colors.text.primary,
    },
    signout: {
      alignItems: 'center',
      paddingVertical: t.spacing.xl,
      marginTop: t.spacing.sm,
    },
    signoutPressed: {
      opacity: 0.6,
    },
    signoutText: {
      fontFamily: t.fontFamilies.ui.medium,
      fontSize: 14,
      color: t.colors.text.secondary,
    },
  });
