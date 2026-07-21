import { useCallback, useMemo, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DashboardHero, EmptyState, InlineNotice, Screen, Skeleton, CollapsibleSection } from '../../components/ui';
import { FacultyPaperCard } from '../../components/FacultyPaperCard';
import { WorkloadStrip, WorkloadFilter } from '../../components/WorkloadStrip';
import { facultyApi, summarizeFacultyWorkload, type FacultyAssignedPaper, FACULTY_ADVANCED_STATUSES } from '../../api/faculty';
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
  const [activeFilter, setActiveFilter] = useState<WorkloadFilter>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await facultyApi.getAssignedPapers();
      setPapers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your dashboard.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const summary = papers ? summarizeFacultyWorkload(papers) : null;

  const needsActionList = useMemo(() => {
    if (!papers) return [];
    let list = papers.filter((p) => p.status === 'pending_faculty' || p.status === 'revision_required');
    if (activeFilter === 'needs_review') {
      list = list.filter((p) => p.status === 'pending_faculty');
    } else if (activeFilter === 'revision_sent') {
      list = list.filter((p) => p.status === 'revision_required');
    } else if (activeFilter === 'completed') {
      return [];
    }
    return list.sort((a, b) => {
      const byStatus = statusPriority(a.status) - statusPriority(b.status);
      if (byStatus !== 0) return byStatus;
      const aDate = new Date(a.submissionDate || a.createdAt || 0).getTime();
      const bDate = new Date(b.submissionDate || b.createdAt || 0).getTime();
      return bDate - aDate;
    });
  }, [papers, activeFilter]);

  const completedList = useMemo(() => {
    if (!papers) return [];
    if (activeFilter === 'needs_review' || activeFilter === 'revision_sent') {
      return [];
    }
    return papers
      .filter((p) => FACULTY_ADVANCED_STATUSES.has(p.status))
      .sort((a, b) => {
        const aDate = new Date(a.submissionDate || a.createdAt || 0).getTime();
        const bDate = new Date(b.submissionDate || b.createdAt || 0).getTime();
        return bDate - aDate;
      });
  }, [papers, activeFilter]);

  const showNeedsAction = activeFilter !== 'completed';
  const showCompleted = activeFilter === null || activeFilter === 'completed';

  const renderList = (list: FacultyAssignedPaper[]) => (
    <View style={styles.list}>
      {list.map((paper, index) => (
        <FacultyPaperCard
          key={paper.id}
          paper={paper}
          index={activeFilter ? undefined : index}
          onPress={() => navigation.navigate('FacultyReviewDetail', { paperId: paper.id })}
        />
      ))}
    </View>
  );

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

          {summary && (
            <WorkloadStrip
              summary={summary}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />
          )}

          {papers === null ? (
            error ? (
              <Text style={styles.hint}>Pull down to retry.</Text>
            ) : (
              <DashboardSkeleton />
            )
          ) : papers.length === 0 ? (
            <EmptyState context="all-caught-up" />
          ) : (
            <View style={styles.sections}>
              {showNeedsAction && (
                <CollapsibleSection title="Needs action" count={needsActionList.length} initiallyExpanded={true}>
                  {needsActionList.length === 0 ? (
                    <EmptyState context="no-papers" />
                  ) : (
                    renderList(needsActionList)
                  )}
                </CollapsibleSection>
              )}

              {showCompleted && (
                <CollapsibleSection title="Completed" count={completedList.length} initiallyExpanded={activeFilter === 'completed'}>
                  {completedList.length === 0 ? (
                    <EmptyState context="no-papers" />
                  ) : (
                    renderList(completedList)
                  )}
                </CollapsibleSection>
              )}
            </View>
          )}
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
      paddingBottom: theme.spacing['3xl'] + 120,
    },
    body: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      gap: theme.spacing.xl,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sections: {
      gap: theme.spacing['2xl'],
      paddingHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
    },
    list: {
      gap: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    hint: {
      ...theme.typography.bodySmall,
      color: theme.colors.text.muted,
      textAlign: 'center',
      paddingVertical: theme.spacing.xl,
    },
  });
