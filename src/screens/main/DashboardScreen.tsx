import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { researchApi } from '../../api/research';
import { notificationsApi } from '../../api/notifications';
import { Category, ResearchPaper, NotificationItem } from '../../types/domain';
import { greetingForHour, initialsFor } from '../../utils/format';
import { resolveCategoryName, buildCategoryNameById } from '../../utils/category';
import { type Theme } from '../../theme';
import { haptics } from '../../lib/haptics';
import { isFirstEntranceArmed } from '../../lib/firstEntrance';
import {
  DashboardHero,
  EmptyState,
  FadeInView,
  InlineNotice,
  Screen,
  Skeleton,
} from '../../components/ui';
import { StandardPaperCard } from '../../components/StandardPaperCard';
import { NotificationCard } from '../../components/NotificationCard';
import { ListEntranceItem } from '../../components/ListEntranceItem';
import { REVISE_REQUIRED_STATUSES, ACTIVE_STATUSES } from '../../components/PaperStatusChip';
import { perfMark, perfSpan, perfStart } from '../../utils/perfLog';

const ASSEMBLE = { distance: 30, duration: 460, fromScale: 0.94 };
const ASSEMBLE_STAGGER = 100;

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();

  const [assemble] = useState(isFirstEntranceArmed);
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  // True once any load has settled — distinguishes cold from warm for the
  // [perf] marks (see loadData) without depending on `papers` state.
  const hasLoadedRef = useRef(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    // Cold vs warm for the [perf] log: only the first load resets the shared
    // clock, so the spans below read as time-since-tab-open on a cold start
    // and don't skew another screen's marks on pull-to-refresh.
    if (!hasLoadedRef.current) perfStart('list:dash');

    const papersSpan = perfSpan('list:dash:papers');
    const categoriesSpan = perfSpan('list:dash:categories');
    const notificationsSpan = perfSpan('list:dash:notifications');

    // Cache-aware (no forceRefresh): SWR serves instantly when valid, or
    // stale + background revalidate — onUpdate paints fresh rows on arrival.
    const [papersResult, categoriesResult, notificationsResult] = await Promise.allSettled([
      researchApi
        .getMyPapers({ onUpdate: (data) => setPapers(data) })
        .finally(papersSpan),
      researchApi
        .getCategories({ onUpdate: (data) => setCategories(data) })
        .finally(categoriesSpan),
      notificationsApi.getNotifications(5).finally(notificationsSpan),
    ]);

    hasLoadedRef.current = true;

    if (papersResult.status === 'fulfilled') {
      setPapers(papersResult.value);
      setError('');
      perfMark('list:dash:papers-settled', { rows: papersResult.value.length });
    } else {
      setError('Failed to load dashboard data.');
    }

    if (categoriesResult.status === 'fulfilled') setCategories(categoriesResult.value);
    if (notificationsResult.status === 'fulfilled') setNotifications(notificationsResult.value);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // First paint proxy for the [perf] log: the dashboard is a ScrollView, so
  // there's no list-layout hook — mark the moment the skeleton swaps for
  // content (loading false after the first load).
  const paintMarkedRef = useRef(false);
  useEffect(() => {
    if (loading || !hasLoadedRef.current || paintMarkedRef.current) return;
    paintMarkedRef.current = true;
    perfMark('list:dash:paint');
  }, [loading]);

  const firstName = useMemo(() => {
    const fullName = user?.fullName?.trim();
    if (!fullName) return '';
    return fullName.split(/\s+/)[0] || '';
  }, [user?.fullName]);

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);
  const initials = useMemo(() => initialsFor(user?.fullName), [user?.fullName]);

  const categoryNameById = useMemo(() => buildCategoryNameById(categories), [categories]);

  const upNextPaper = useMemo(() => {
    const reviseRequired = papers
      .filter((p) => REVISE_REQUIRED_STATUSES.has(p.status))
      .sort((a, b) => {
        const aTime = new Date(a.submission_date || a.created_at || 0).getTime();
        const bTime = new Date(b.submission_date || b.created_at || 0).getTime();
        return aTime - bTime;
      });
    if (reviseRequired.length > 0) return reviseRequired[0];
    return papers.find((p) => ACTIVE_STATUSES.has(p.status)) || null;
  }, [papers]);

  const subLine = useMemo(() => {
    const reviseCount = papers.filter((p) => REVISE_REQUIRED_STATUSES.has(p.status)).length;
    const reviewCount = papers.filter((p) => ACTIVE_STATUSES.has(p.status)).length;
    if (reviseCount > 0) {
      return {
        text: `${reviseCount} paper${reviseCount === 1 ? '' : 's'} require${reviseCount === 1 ? 's' : ''} revision`,
        urgent: true,
      };
    }
    if (reviewCount > 0) {
      return {
        text: `${reviewCount} paper${reviewCount === 1 ? '' : 's'} in review`,
        urgent: false,
      };
    }
    return { text: 'You’re all caught up', urgent: false };
  }, [papers]);

  return (
    <Screen gutter={0} edges={{ top: false, bottom: false }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              haptics.light();
              loadData(true);
            }}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        }
      >
        <FadeInView
          active={assemble}
          distance={-ASSEMBLE.distance}
          duration={ASSEMBLE.duration}
          fromScale={ASSEMBLE.fromScale}
        >
          <DashboardHero
            greeting={greeting}
            name={firstName || 'Student'}
            initials={initials}
            statusLine={subLine}
            onPressAvatar={() => navigation.navigate('Profile')}
          />
        </FadeInView>

        <View style={styles.body}>
          {error ? <InlineNotice tone="danger" message={error} /> : null}

          {loading ? (
            <View style={styles.sections}>
              <Skeleton height={140} radius="lg" />
              <Skeleton height={200} radius="lg" />
            </View>
          ) : (
            <View style={styles.sections}>
              <FadeInView
                active={assemble}
                delay={ASSEMBLE_STAGGER}
                distance={ASSEMBLE.distance}
                duration={ASSEMBLE.duration}
                fromScale={ASSEMBLE.fromScale}
              >
                {upNextPaper ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Up Next</Text>
                    <StandardPaperCard
                      paper={upNextPaper}
                      variant="papers"
                      category={resolveCategoryName(upNextPaper.category, categoryNameById)}
                      onPress={() =>
                        navigation.navigate('ResearchDetail', {
                          paperId: upNextPaper.id,
                          from: 'dashboard',
                        })
                      }
                      onResubmit={() =>
                        (navigation.getParent() ?? navigation).navigate('SubmitResearch', {
                          resubmitPaperId: upNextPaper.id,
                        })
                      }
                    />
                  </View>
                ) : papers.length === 0 ? (
                  <EmptyState context="no-papers" />
                ) : (
                  <EmptyState context="all-caught-up" />
                )}
              </FadeInView>

              {notifications.length > 0 && (
                <FadeInView
                  active={assemble}
                  delay={ASSEMBLE_STAGGER * 2}
                  distance={ASSEMBLE.distance}
                  duration={ASSEMBLE.duration}
                  fromScale={ASSEMBLE.fromScale}
                >
                  <View style={[styles.section, styles.activitySection]}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <View style={styles.activityList}>
                      {notifications.map((item, index) => (
                        <ListEntranceItem key={item.id} index={index}>
                          <NotificationCard
                            notification={item}
                            onPress={() => {
                              if (item.research_id) {
                                navigation.navigate('ResearchDetail', {
                                  paperId: item.research_id,
                                });
                              }
                            }}
                          />
                        </ListEntranceItem>
                      ))}
                    </View>
                  </View>
                </FadeInView>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingBottom: t.spacing['3xl'] + 100,
    },
    body: {
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.xl,
      gap: t.spacing.xl,
    },
    sections: {
      gap: t.spacing['2xl'],
    },
    section: {
      gap: t.spacing.sm,
    },
    sectionTitle: {
      ...t.typography.h3,
      color: t.colors.text.primary,
      marginBottom: t.spacing.xs,
    },
    activitySection: {
      marginTop: t.spacing.xl,
    },
    activityList: {
      gap: t.spacing.sm,
    },
  });
