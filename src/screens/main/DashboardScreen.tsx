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
  TopBar,
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
  const [savedPapers, setSavedPapers] = useState<SavedPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const [papersResult, savedResult] = await Promise.allSettled([
      researchApi.getMyPapers(),
      getSavedPapers(3),
    ]);

    if (papersResult.status === 'fulfilled') {
      setPapers(papersResult.value);
      setError('');
    } else {
      setError('Failed to load dashboard data.');
    }
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
      <TopBar>
        <Text style={styles.greeting}>
          {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
        </Text>
        {statusLine ? (
          <Text style={[styles.statusLine, statusLine.urgent && styles.statusLineUrgent]}>
            {statusLine.text}
          </Text>
        ) : null}
      </TopBar>

      {error ? <InlineNotice tone="danger" message={error} /> : null}

      <View style={styles.quickActions}>
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
