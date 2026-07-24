import { useCallback, useMemo, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight } from 'lucide-react-native';
import { DashboardHero, EmptyState, InlineNotice, Screen, Skeleton, WorkloadChart } from '../../components/ui';
import { FacultyPaperCard } from '../../components/FacultyPaperCard';
import { facultyApi, type FacultyAssignedPaper, type FacultyWorkloadSummary } from '../../api/faculty';
import { NotificationItem } from '../../types/domain';
import { NotificationCard } from '../../components/NotificationCard';
import { RootStackParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { greetingForHour, initialsFor } from '../../utils/format';

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

  const [summary, setSummary] = useState<FacultyWorkloadSummary | null>(null);
  const [upNextPaper, setUpNextPaper] = useState<FacultyAssignedPaper | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      
      const [summaryData, paperData, notifData] = await Promise.all([
        facultyApi.getDashboardSummary(),
        facultyApi.getUpNextPaper(),
        facultyApi.getNotifications(3)
      ]);

      setSummary(summaryData);
      setUpNextPaper(paperData);
      setNotifications(notifData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your dashboard.');
    } finally {
      setInitialLoading(false);
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
    <Screen gutter={0} edges={{ top: false, bottom: false }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
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
            <WorkloadChart
              summary={summary}
              onSelectFilter={(filter) => {
                let initialFilter: 'needs_review' | 'revisions' | 'approved' | 'all' = 'all';
                if (filter === 'needs_review') initialFilter = 'needs_review';
                if (filter === 'revisions') initialFilter = 'revisions';
                if (filter === 'approved') initialFilter = 'approved';
                navigation.navigate('FacultyReview', { initialFilter });
              }}
            />
          )}

          {initialLoading ? (
            <DashboardSkeleton />
          ) : (
            <View style={styles.sections}>
              {upNextPaper && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Up Next</Text>
                  <FacultyPaperCard
                    paper={upNextPaper}
                    onPress={() => navigation.navigate('FacultyReviewDetail', { paperId: upNextPaper.id })}
                  />
                  {summary && summary.pendingReview > 1 && (
                    <View style={styles.seeAllWrapper}>
                      <Pressable 
                        style={({ pressed }) => [styles.seeAllButton, pressed && { opacity: 0.6 }]}
                        onPress={() => navigation.navigate('FacultyReview', { initialFilter: 'needs_review' })}
                      >
                        <Text style={styles.seeAllText}>See all {summary.pendingReview} pending papers</Text>
                        <ArrowRight size={16} color={theme.colors.brand.primary} />
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {!upNextPaper && summary && summary.pendingReview === 0 && (
                 <EmptyState context="all-caught-up" />
              )}

              {notifications && notifications.length > 0 && (
                <View style={[styles.section, styles.activitySection]}>
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                  <View style={styles.activityList}>
                    {notifications.map((item) => (
                      <NotificationCard
                         key={item.id}
                         notification={item}
                         onPress={() => {
                           if (item.research_id) {
                             navigation.navigate('FacultyReviewDetail', { paperId: item.research_id });
                           }
                         }}
                      />
                    ))}
                  </View>
                </View>
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
    seeAllWrapper: {
      alignItems: 'center',
      paddingTop: theme.spacing.sm,
    },
    seeAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    seeAllText: {
      fontFamily: theme.fontFamilies.ui.medium,
      fontSize: 14,
      color: theme.colors.brand.primary,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      fontFamily: theme.fontFamilies.ui.semibold,
      fontSize: 18,
      color: theme.colors.text.primary,
    },
    activitySection: {
      marginTop: theme.spacing.md,
    },
    activityList: {
      gap: theme.spacing.md,
      paddingTop: theme.spacing.xs,
    },
    sections: {
      gap: theme.spacing['2xl'],
      marginTop: theme.spacing.md,
    },
    list: {
      gap: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
  });
