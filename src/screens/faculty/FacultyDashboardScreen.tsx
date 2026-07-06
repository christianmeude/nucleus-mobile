import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  EmptyState,
  InlineNotice,
  PressableCard,
  Screen,
  Skeleton,
  Stat,
} from '../../components/ui';
import {
  facultyApi,
  summarizeFacultyWorkload,
  type FacultyAssignedPaper,
  type FacultyWorkloadSummary,
} from '../../api/faculty';
import { facultyStatusLabel } from './facultyStatus';
import { RootStackParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

const RECENT_LIMIT = 5;

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type FacultyNavigation = NativeStackNavigationProp<RootStackParamList>;

const WorkloadGrid = ({ summary }: { summary: FacultyWorkloadSummary }) => {
  const styles = useThemedStyles(makeStyles);
  return (
  <View style={styles.grid}>
    <View style={styles.gridItem}>
      <Stat
        label="Pending review"
        value={summary.pendingReview}
        tone={summary.pendingReview > 0 ? 'warning' : 'default'}
      />
    </View>
    <View style={styles.gridItem}>
      <Stat label="Revisions" value={summary.revisionRequired} />
    </View>
    <View style={styles.gridItem}>
      <Stat label="Approved by you" value={summary.approvedByYou} />
    </View>
    <View style={styles.gridItem}>
      <Stat label="Total assigned" value={summary.totalAssigned} />
    </View>
  </View>
  );
};

const DashboardSkeleton = () => {
  const styles = useThemedStyles(makeStyles);
  return (
  <>
    <View style={styles.grid}>
      {[0, 1, 2, 3].map((key) => (
        <View key={key} style={styles.gridItem}>
          <Skeleton height={64} radius="lg" />
        </View>
      ))}
    </View>
    <Skeleton height={18} width="50%" />
    <View style={styles.list}>
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} height={68} radius="lg" />
      ))}
    </View>
  </>
  );
};

export const FacultyDashboardScreen = () => {
  const navigation = useNavigation<FacultyNavigation>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const firstName = user?.fullName?.trim().split(/\s+/)[0] ?? '';
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
  const recent = papers ? papers.slice(0, RECENT_LIMIT) : [];

  return (
    <Screen edges={{ bottom: false }}>
      <ScrollView
        style={styles.screen}
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
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>
          {firstName ? `Welcome, ${firstName}.` : 'Welcome.'}
        </Text>
      </View>

      {error ? <InlineNotice tone="danger" message={error} /> : null}

      {papers === null ? (
        error ? (
          <Text style={styles.hint}>Pull down to retry.</Text>
        ) : (
          <DashboardSkeleton />
        )
      ) : (
        <>
          {summary ? <WorkloadGrid summary={summary} /> : null}

          <Text style={styles.sectionTitle}>Recent assignments</Text>

          {recent.length === 0 ? (
            <EmptyState
              title="No assigned papers"
              message="Papers assigned to you for review will appear here."
            />
          ) : (
            <View style={styles.list}>
              {recent.map((paper) => (
                <PressableCard
                  key={paper.id}
                  accessibilityLabel={`Review ${paper.title}`}
                  onPress={() =>
                    navigation.navigate('FacultyReviewDetail', { paperId: paper.id })
                  }
                >
                  <Text style={styles.paperTitle} numberOfLines={2}>
                    {paper.title}
                  </Text>
                  <Text style={styles.paperMeta} numberOfLines={1}>
                    {paper.authorName} · {facultyStatusLabel(paper.status)} ·{' '}
                    {formatDate(paper.submissionDate || paper.createdAt)}
                  </Text>
                </PressableCard>
              ))}
            </View>
          )}
        </>
      )}
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: theme.spacing.md,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing['3xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  gridItem: {
    flexGrow: 1,
    flexBasis: '46%',
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
  },
  list: {
    gap: theme.spacing.md,
  },
  paperTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text.primary,
  },
  paperMeta: {
    ...theme.typography.metadata,
    color: theme.colors.text.muted,
    marginTop: theme.spacing.xs,
  },
  hint: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.muted,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
});
