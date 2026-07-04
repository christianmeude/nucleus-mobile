import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { researchApi } from '../../api/research';
import { notificationsApi } from '../../api/notifications';
import { getSavedPapers, SavedPaper } from '../../api/collections';
import { ResearchPaper } from '../../types/domain';
import { paperDate } from '../../utils/format';
import { type Theme } from '../../theme';
import { ResearchCard } from '../../components/ResearchCard';
import { ListEntranceItem } from '../../components/ListEntranceItem';
import {
  EmptyState,
  InlineNotice,
  Skeleton,
} from '../../components/ui';
import {
  ACTION_STATUSES,
  ACTIVE_STATUSES,
} from '../../components/PaperStatusChip';

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [savedPapers, setSavedPapers] = useState<SavedPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const [papersResult, countResult, savedResult] = await Promise.allSettled([
      researchApi.getMyPapers(),
      notificationsApi.getUnreadCount(),
      getSavedPapers(3),
    ]);

    if (papersResult.status === 'fulfilled') {
      setPapers(papersResult.value);
      setError('');
    } else {
      setError('Failed to load dashboard data.');
    }
    if (countResult.status === 'fulfilled') setUnreadCount(countResult.value);
    if (savedResult.status === 'fulfilled') setSavedPapers(savedResult.value);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const firstName = useMemo(() => {
    const fullName = user?.fullName?.trim();
    if (!fullName) return '';
    return fullName.split(/\s+/)[0] || '';
  }, [user?.fullName]);

  const initials = useMemo(() => {
    const fullName = user?.fullName?.trim();
    if (!fullName) return '?';
    const parts = fullName.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [user?.fullName]);

  const statusLine = useMemo(() => {
    if (papers.length === 0) return null;
    const needsAction = papers.filter((p) => ACTION_STATUSES.has(p.status)).length;
    if (needsAction > 0) {
      return {
        text: `${needsAction} paper${needsAction === 1 ? '' : 's'} need${needsAction === 1 ? 's' : ''} revision`,
        urgent: true,
      };
    }
    const active = papers.filter((p) => ACTIVE_STATUSES.has(p.status)).length;
    if (active > 0) {
      return { text: `${active} paper${active === 1 ? '' : 's'} in review`, urgent: false };
    }
    return { text: 'All papers are up to date', urgent: false };
  }, [papers]);

  const recentPapers = useMemo(() => {
    return [...papers]
      .sort((a, b) => {
        const aDate = new Date(paperDate(a) || 0).getTime();
        const bDate = new Date(paperDate(b) || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 3);
  }, [papers]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          tintColor={theme.colors.brand.primary}
          colors={[theme.colors.brand.primary]}
        />
      }
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
          </Text>
          {statusLine ? (
            <Text style={[styles.statusLine, statusLine.urgent && styles.statusLineUrgent]}>
              {statusLine.text}
            </Text>
          ) : null}
        </View>
        <Pressable
          style={({ pressed }) => [styles.avatarButton, pressed && styles.avatarButtonPressed]}
          onPress={() => navigation.navigate('Profile')}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Text style={styles.avatarButtonText}>{initials}</Text>
        </Pressable>
      </View>

      {error ? <InlineNotice tone="danger" message={error} /> : null}

      <View style={styles.quickActions}>
        <Pressable
          style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
          onPress={() => navigation.navigate('SubmitResearch')}
          accessibilityRole="button"
          accessibilityLabel="Submit a research paper"
        >
          <Ionicons name="create-outline" size={22} color={theme.colors.brand.primary} />
          <Text style={styles.quickActionLabel}>Submit paper</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
          onPress={() => navigation.navigate('Browse')}
          accessibilityRole="button"
          accessibilityLabel="Browse research"
        >
          <Ionicons name="search-outline" size={22} color={theme.colors.brand.primary} />
          <Text style={styles.quickActionLabel}>Browse research</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.activityRow, pressed && styles.activityRowPressed]}
        onPress={() => navigation.navigate('Notifications')}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications-outline" size={20} color={theme.colors.text.secondary} />
        <Text style={styles.activityLabel}>Notifications</Text>
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={theme.colors.text.muted} />
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent papers</Text>
        {loading ? (
          <View style={styles.skeletonList}>
            <Skeleton height={108} />
            <Skeleton height={108} />
          </View>
        ) : recentPapers.length === 0 ? (
          <EmptyState
            icon={
              <Ionicons name="documents-outline" size={24} color={theme.colors.text.muted} />
            }
            title="No papers yet"
            message="Your recent papers will appear here."
          />
        ) : (
          recentPapers.map((paper, index) => (
            <ListEntranceItem key={paper.id} index={index}>
              <ResearchCard
                paper={paper}
                onPress={() => navigation.navigate('ResearchDetail', { paperId: paper.id })}
              />
            </ListEntranceItem>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved</Text>
        {savedPapers.length === 0 ? (
          <Text style={styles.savedEmpty}>Papers you bookmark will appear here.</Text>
        ) : (
          savedPapers.map((paper) => (
            <Pressable
              key={paper.id}
              style={({ pressed }) => [styles.savedRow, pressed && styles.savedRowPressed]}
              onPress={() => navigation.navigate('ResearchDetail', { paperId: paper.id })}
              accessibilityRole="button"
              accessibilityLabel={paper.title || 'Saved paper'}
            >
              <Ionicons name="bookmark" size={15} color={theme.colors.brand.accent} />
              <Text style={styles.savedTitle} numberOfLines={2}>
                {paper.title || 'Untitled'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.text.muted} />
            </Pressable>
          ))
        )}
      </View>
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
      padding: t.spacing.lg,
      gap: t.spacing.lg,
      paddingBottom: t.spacing['3xl'],
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: t.spacing.sm,
    },
    headerLeft: {
      flex: 1,
      gap: t.spacing.xs,
    },
    avatarButton: {
      width: 44,
      height: 44,
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
      backgroundColor: t.colors.brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarButtonPressed: {
      opacity: 0.7,
    },
    avatarButtonText: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 14,
      color: t.colors.text.onBrand,
    },
    greeting: {
      ...t.typography.h1,
      color: t.colors.text.primary,
    },
    statusLine: {
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 14,
      color: t.colors.text.secondary,
    },
    statusLineUrgent: {
      fontFamily: t.fontFamilies.ui.semibold,
      color: t.colors.text.primary,
    },
    quickActions: {
      flexDirection: 'row',
      gap: t.spacing.sm,
    },
    quickAction: {
      flex: 1,
      alignItems: 'flex-start',
      gap: t.spacing.xs,
      padding: t.spacing.md,
      borderRadius: t.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      backgroundColor: t.colors.surface.raised,
    },
    quickActionPressed: {
      opacity: 0.7,
    },
    quickActionLabel: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 13,
      color: t.colors.text.primary,
    },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
      paddingVertical: t.spacing.md,
      paddingHorizontal: t.spacing.md,
      borderRadius: t.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      backgroundColor: t.colors.surface.raised,
    },
    activityRowPressed: {
      opacity: 0.7,
    },
    activityLabel: {
      flex: 1,
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 14,
      color: t.colors.text.primary,
    },
    badge: {
      backgroundColor: t.colors.brand.primary,
      borderRadius: t.radii.pill,
      paddingHorizontal: 6,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: 'center',
    },
    badgeText: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 11,
      color: t.colors.text.onBrand,
    },
    section: {
      gap: t.spacing.sm,
    },
    sectionTitle: {
      ...t.typography.h3,
      color: t.colors.text.primary,
    },
    skeletonList: {
      gap: t.spacing.sm,
    },
    savedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
      paddingVertical: t.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.colors.border.subtle,
    },
    savedRowPressed: {
      opacity: 0.6,
    },
    savedTitle: {
      flex: 1,
      fontFamily: t.fontFamilies.display.regular,
      fontSize: 14,
      lineHeight: 20,
      color: t.colors.text.primary,
    },
    savedEmpty: {
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 14,
      color: t.colors.text.muted,
    },
  });
