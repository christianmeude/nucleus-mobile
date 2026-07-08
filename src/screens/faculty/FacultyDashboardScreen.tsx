import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  DashboardHero,
  EmptyState,
  InlineNotice,
  Screen,
  Skeleton,
} from '../../components/ui';
import { FacultyPaperCard } from '../../components/FacultyPaperCard';
import {
  facultyApi,
  summarizeFacultyWorkload,
  type FacultyAssignedPaper,
} from '../../api/faculty';
import { RootStackParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { greetingForHour, initialsFor } from '../../utils/format';

const RECENT_LIMIT = 5;

/** Review-queue sort weight: papers awaiting this faculty's review lead, then
 * revisions, then everything else — so the dashboard surfaces what needs action. */
const statusPriority = (status: string): number => {
  if (status === 'pending_faculty') return 0;
  if (status === 'revision_required') return 1;
  return 2;
};

type FacultyNavigation = NativeStackNavigationProp<RootStackParamList>;

const DashboardSkeleton = () => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.list}>
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} height={80} radius="lg" />
      ))}
    </View>
  );
};

export const FacultyDashboardScreen = () => {
  const navigation = useNavigation<FacultyNavigation>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const firstName = useMemo(() => user?.fullName?.trim().split(/\s+/)[0] ?? '', [user?.fullName]);
  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);
  const initials = useMemo(() => initialsFor(user?.fullName), [user?.fullName]);
  const [papers, setPapers] = useState<FacultyAssignedPaper[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await facultyApi.getAssignedPapers();
      setPapers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your dashboard.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const summary = papers ? summarizeFacultyWorkload(papers) : null;

  // Prioritize papers awaiting review, then revisions, then the rest by recency.
  const queue = useMemo(() => {
    if (!papers) return [];
    return [...papers]
      .sort((a, b) => {
        const byStatus = statusPriority(a.status) - statusPriority(b.status);
        if (byStatus !== 0) return byStatus;
        const aDate = new Date(a.submissionDate || a.createdAt || 0).getTime();
        const bDate = new Date(b.submissionDate || b.createdAt || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, RECENT_LIMIT);
  }, [papers]);

  // Faculty analogue of the student hero's status line: a one-glance read of the
  // review queue, mapped from the same workload summary.
  const statusLine = summary
    ? summary.pendingReview > 0
      ? {
          text: `${summary.pendingReview} paper${summary.pendingReview === 1 ? '' : 's'} pending review`,
          urgent: true,
        }
      : summary.revisionRequired > 0
        ? { text: `${summary.revisionRequired} awaiting revision`, urgent: false }
        : { text: 'You’re all caught up', urgent: false }
    : null;

  return (
    // Top edge opted out of Screen's own inset padding: the navy hero band bleeds
    // under the status bar, so its safe-area clearance is applied to the hero
    // itself. Bottom edge is opted out too — the floating tab bar owns it.
    <Screen gutter={0} edges={{ top: false, bottom: false }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        }
      >
        <DashboardHero
          greeting={greeting}
          name={firstName || 'Faculty'}
          initials={initials}
          statusLine={statusLine}
          onPressAvatar={() => navigation.navigate('FacultyProfile' as never)}
        />

        <View style={styles.body}>
          {error ? <InlineNotice tone="danger" message={error} /> : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Papers to review</Text>

            {papers === null ? (
              error ? (
                <Text style={styles.hint}>Pull down to retry.</Text>
              ) : (
                <DashboardSkeleton />
              )
            ) : queue.length === 0 ? (
              <EmptyState
                title="No assigned papers"
                message="Papers assigned to you for review will appear here."
              />
            ) : (
              <View style={styles.list}>
                {queue.map((paper) => (
                  <FacultyPaperCard
                    key={paper.id}
                    paper={paper}
                    onPress={() => navigation.navigate('FacultyReviewDetail', { paperId: paper.id })}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingBottom: theme.spacing['3xl'],
    },
    body: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      gap: theme.spacing.xl,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.h3,
      color: theme.colors.text.primary,
    },
    list: {
      gap: theme.spacing.md,
    },
    hint: {
      ...theme.typography.bodySmall,
      color: theme.colors.text.muted,
      textAlign: 'center',
      paddingVertical: theme.spacing.xl,
    },
  });
