import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Chip,
  EmptyState,
  InlineNotice,
  PressableCard,
  PressableScale,
  Screen,
  Skeleton,
  Stat,
  TopBar,
} from '../../components/ui';
import {
  facultyApi,
  summarizeFacultyWorkload,
  type FacultyAssignedPaper,
  type FacultyWorkloadSummary,
} from '../../api/faculty';
import { facultyStatusLabel, facultyStatusTone } from './facultyStatus';
import { RootStackParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { greetingForHour, initialsFor } from '../../utils/format';

const RECENT_LIMIT = 5;

/**
 * `linear-gradient(158deg, primary, primary-hover)` (DESIGN.md, Dashboard A3),
 * pre-converted to expo-linear-gradient's normalized start/end points — the
 * same hero band the student Dashboard uses, so both roles share one look.
 */
const HERO_GRADIENT_START = { x: 0.313, y: 0.036 };
const HERO_GRADIENT_END = { x: 0.687, y: 0.964 };

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
  const insets = useSafeAreaInsets();
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
  const recent = papers ? papers.slice(0, RECENT_LIMIT) : [];

  // Faculty analogue of the student hero's status line: a one-glance read of the
  // review queue, mapped from the same workload summary the grid uses.
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
        <View style={styles.hero}>
          <LinearGradient
            colors={[theme.colors.brand.primary, theme.colors.brand.primaryHover]}
            start={HERO_GRADIENT_START}
            end={HERO_GRADIENT_END}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroGlow, { backgroundColor: theme.colors.brand.accent }]} />
          <Text style={[styles.heroWatermark, { color: theme.colors.text.onBrand }]}>N</Text>

          <View style={[styles.heroContent, { paddingTop: insets.top + theme.spacing.md }]}>
            <TopBar
              variant="hero"
              trailing={
                <PressableScale
                  onPress={() => navigation.navigate('FacultyProfile' as never)}
                  style={styles.heroAvatar}
                  accessibilityRole="button"
                  accessibilityLabel="Profile"
                >
                  <Text style={styles.heroAvatarText}>{initials}</Text>
                </PressableScale>
              }
            >
              <Text style={styles.heroGreeting}>{greeting}</Text>
              <Text style={styles.heroName} numberOfLines={1}>
                {firstName || 'Faculty'}
              </Text>
              {statusLine ? (
                <Text style={[styles.heroSubLine, statusLine.urgent && styles.heroSubLineUrgent]}>
                  {statusLine.text}
                </Text>
              ) : null}
            </TopBar>
          </View>
        </View>

        <View style={styles.body}>
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

              <View style={styles.section}>
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
                        <View style={styles.badgeRow}>
                          <Chip
                            label={facultyStatusLabel(paper.status)}
                            variant="status"
                            tone={facultyStatusTone(paper.status)}
                          />
                        </View>
                        <Text style={styles.paperTitle} numberOfLines={2}>
                          {paper.title}
                        </Text>
                        <Text style={styles.paperMeta} numberOfLines={1}>
                          {paper.authorName} ·{' '}
                          {formatDate(paper.submissionDate || paper.createdAt)}
                        </Text>
                      </PressableCard>
                    ))}
                  </View>
                )}
              </View>
            </>
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
    paddingBottom: theme.spacing['3xl'],
  },
  hero: {
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderCurve: 'continuous',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: theme.radii.pill,
    opacity: 0.18,
  },
  heroWatermark: {
    position: 'absolute',
    right: -18,
    bottom: -36,
    fontSize: 168,
    lineHeight: 168,
    fontFamily: theme.fontFamilies.display.bold,
    opacity: 0.05,
  },
  heroContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  heroGreeting: {
    fontFamily: theme.fontFamilies.ui.regular,
    fontSize: 14,
    color: theme.colors.text.onBrand,
    opacity: 0.75,
  },
  heroName: {
    ...theme.typography.h1,
    color: theme.colors.text.onBrand,
    marginTop: 2,
  },
  heroSubLine: {
    fontFamily: theme.fontFamilies.ui.regular,
    fontSize: 13,
    color: theme.colors.text.onBrand,
    opacity: 0.75,
    marginTop: theme.spacing.xs,
  },
  heroSubLineUrgent: {
    fontFamily: theme.fontFamilies.ui.semibold,
    opacity: 1,
  },
  heroAvatar: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.pill,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroAvatarText: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 14,
    color: theme.colors.text.onBrand,
  },
  body: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  section: {
    gap: theme.spacing.sm,
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
  badgeRow: {
    flexDirection: 'row',
  },
  paperTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.xs,
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
