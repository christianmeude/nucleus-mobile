import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View, Pressable } from 'react-native';
import { LegendList } from '@legendapp/list/react-native';

import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { researchApi } from '../../api/research';
import { apiCache } from '../../utils/apiCache';
import { Category, PaperStatus, ResearchPaper } from '../../types/domain';
import {
  buildCategoryColorById,
  buildCategoryNameById,
  resolveCategoryColor,
  resolveCategoryName,
} from '../../utils/category';
import { getPrimaryAuthorName } from '../../utils/format';
import { listEpochKey } from '../../utils/listEpochKey';
import { perfMark, perfSpan, perfStart } from '../../utils/perfLog';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { StandardPaperCard } from '../../components/StandardPaperCard';
import { Plus } from 'lucide-react-native';

import {
  REVISE_REQUIRED_STATUSES,
  ACTIVE_STATUSES,
} from '../../components/PaperStatusChip';
import {
  AtomicListPaint,
  EmptyState,
  Icon,
  InlineNotice,
  Screen,
  SearchField,
  FilterSelect,
  Skeleton,
  TopBar,
  Button,
  SheetPresenter,
  Input,
} from '../../components/ui';

type FilterKey = 'all' | 'active' | 'action' | 'approved' | 'published';

const isFilterMatch = (status: PaperStatus, filter: FilterKey) => {
  if (filter === 'all') return true;
  if (filter === 'active') return ACTIVE_STATUSES.has(status);
  if (filter === 'approved') return status === 'approved';
  if (filter === 'published') return status === 'published';
  return REVISE_REQUIRED_STATUSES.has(status);
};

export const MyPapersScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const cachedPapers = apiCache.getStale<ResearchPaper[]>('research:myPapers');
  const cachedCategories = apiCache.getStale<Category[]>('research:categories');

  const [papers, setPapers] = useState<ResearchPaper[]>(() => cachedPapers ?? []);
  const [categories, setCategories] = useState<Category[]>(() => cachedCategories ?? []);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(() => !(cachedPapers && cachedPapers.length > 0));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // DOI Publication Request State
  const [publishTarget, setPublishTarget] = useState<ResearchPaper | null>(null);
  const [doiInput, setDoiInput] = useState('');
  const [publishSubmitting, setPublishSubmitting] = useState(false);
  const [publishError, setPublishError] = useState('');

  // Tracks whether we have ever painted data. Drives skeleton-vs-spinner
  // choice without depending on `papers` state.
  const hasDataRef = useRef(Boolean(cachedPapers && cachedPapers.length > 0));

  const loadData = useCallback(
    async (mode?: { refresh?: boolean }) => {
      const force = mode?.refresh === true;
      // Cache-aware: without `refresh` the SWR cache serves instantly when
      // valid (or stale + background revalidate via onUpdate). `refresh`
      // bypasses cache — pull-to-refresh and post-mutate only.
      if (force) {
        setRefreshing(true);
      } else if (!hasDataRef.current) {
        perfStart('list:papers');
      }

      const papersSpan = perfSpan('list:papers:rows');
      const categoriesSpan = perfSpan('list:papers:categories');

      const [papersResult, categoriesResult] = await Promise.allSettled([
        researchApi
          .getMyPapers({
            ...(force ? { forceRefresh: true } : {}),
            onUpdate: (data) => {
              hasDataRef.current = true;
              setPapers((prev) => {
                if (
                  prev.length === data.length &&
                  prev.every((p, i) => p.id === data[i].id && p.status === data[i].status)
                ) {
                  return prev;
                }
                return data;
              });
            },
          })
          .finally(papersSpan),
        researchApi
          .getCategories({
            ...(force ? { forceRefresh: true } : {}),
            onUpdate: (data) =>
              setCategories((prev) => {
                if (prev.length === data.length && prev.every((c, i) => c.id === data[i].id)) {
                  return prev;
                }
                return data;
              }),
          })
          .finally(categoriesSpan),
      ]);

      if (papersResult.status === 'fulfilled') {
        hasDataRef.current = true;
        setPapers((prev) => {
          const fresh = papersResult.value;
          if (
            prev.length === fresh.length &&
            prev.every((p, i) => p.id === fresh[i].id && p.status === fresh[i].status)
          ) {
            return prev;
          }
          return fresh;
        });
        setError('');
      } else if (!hasDataRef.current) {
        // Only surface failure when there is nothing to show; with cached
        // rows on screen a failed refresh stays silent (SWR retries next).
        setError('Unable to load your papers.');
      }
      if (categoriesResult.status === 'fulfilled') {
        setCategories((prev) => {
          const fresh = categoriesResult.value;
          if (prev.length === fresh.length && prev.every((c, i) => c.id === fresh[i].id)) {
            return prev;
          }
          return fresh;
        });
      }

      perfMark('list:papers:rows-settled', {
        rows: papersResult.status === 'fulfilled' ? papersResult.value.length : null,
        ok: papersResult.status === 'fulfilled',
      });

      setLoading(false);
      setRefreshing(false);
    },
    [],
  );

  // Pre-load data on mount (during pager preloading so it is already painted before tab enter)
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) void loadData();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loadData]);

  // Refetch-on-return: if already mounted and painted, defer background revalidation
  // by 350ms so it doesn't fight the tab swipe animation on the JS thread.
  useFocusEffect(
    useCallback(() => {
      if (!hasDataRef.current) {
        loadData();
        return;
      }
      const timer = setTimeout(() => {
        loadData();
      }, 350);
      return () => clearTimeout(timer);
    }, [loadData]),
  );

  const categoryNameById = useMemo(() => buildCategoryNameById(categories), [categories]);
  const categoryColorById = useMemo(() => buildCategoryColorById(categories), [categories]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return [...papers]
      .filter((paper) => isFilterMatch(paper.status, activeFilter))
      .filter((paper) => {
        if (!normalized) return true;
        // List rows carry no abstract (see PAPER_LIST_SELECT) — search
        // matches title, keywords, and author name instead.
        const keywords = Array.isArray(paper.keywords) ? paper.keywords.join(' ') : '';
        const target = `${paper.title} ${keywords} ${getPrimaryAuthorName(paper)}`.toLowerCase();
        return target.includes(normalized);
      })
      .sort((left, right) => {
        const leftDate = new Date(paperDateValue(left)).getTime();
        const rightDate = new Date(paperDateValue(right)).getTime();
        return rightDate - leftDate;
      });
  }, [activeFilter, papers, query]);

  const submitPublishRequest = useCallback(async () => {
    if (!publishTarget) return;

    // Validate DOI
    const cleaned = doiInput.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
    if (!/^10\.\d{4,9}\/\S+$/i.test(cleaned)) {
      setPublishError('Please enter a valid DOI (e.g. 10.1234/example)');
      return;
    }

    setPublishError('');
    setPublishSubmitting(true);
    try {
      await researchApi.requestPublish(publishTarget.id, cleaned);
      setPublishTarget(null);
      setDoiInput('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadData({ refresh: true }); // post-mutate: bypass cache
    } catch (err: any) {
      setPublishError(err.message || 'Failed to submit publication request.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPublishSubmitting(false);
    }
  }, [publishTarget, doiInput, loadData]);

  const handlePaperPress = useCallback(
    (paperId: string) => {
      navigation.navigate('ResearchDetail', { paperId, from: 'myPapers' });
    },
    [navigation],
  );

  const handleResubmitPress = useCallback(
    (paperId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.getParent()?.navigate('SubmitResearch', { resubmitPaperId: paperId });
    },
    [navigation],
  );

  const renderPaperItem = useCallback(
    ({ item }: { item: ResearchPaper }) => (
      <StandardPaperCard
        paper={item}
        variant="papers"
        category={resolveCategoryName(item.category, categoryNameById)}
        categoryColor={resolveCategoryColor(item.category, categoryColorById)}
        onPress={() => handlePaperPress(item.id)}
        onRequestPublication={() => setPublishTarget(item)}
        onResubmit={() => handleResubmitPress(item.id)}
      />
    ),
    [categoryNameById, categoryColorById, handlePaperPress, handleResubmitPress],
  );

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData({ refresh: true });
  }, [loadData]);

  // First paint proxy for the [perf] log: mark the moment rows first become
  // available to render. Deliberately an effect on `papers`, not the list's
  // onLayout — the list lays out immediately with skeletons while loading, so
  // a layout hook would measure skeleton appearance, not the data.
  const paintMarkedRef = useRef(false);
  useEffect(() => {
    if (paintMarkedRef.current || papers.length === 0) return;
    paintMarkedRef.current = true;
    perfMark('list:papers:paint', { rows: papers.length });
  }, [papers]);

  const keyExtractor = useCallback((item: ResearchPaper) => item.id, []);

  const listHeaderElement = useMemo(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.subbar}>
          <Text style={styles.resultCount}>
            {filtered.length} {filtered.length === 1 ? 'Paper' : 'Papers'}
          </Text>
        </View>

        {error ? <InlineNotice tone="danger" message={error} /> : null}

        {loading ? (
          <View style={styles.skeletonList}>
            <Skeleton height={140} radius="lg" />
            <Skeleton height={140} radius="lg" />
          </View>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <EmptyState
            title="No papers found"
            message={
              query ? 'Try adjusting your search terms.' : "You haven't submitted any papers yet."
            }
          />
        ) : null}
      </View>
    ),
    [filtered.length, error, loading, query, styles],
  );

  return (
    <SheetPresenter
      open={!!publishTarget}
      size="content"
      onClose={() => {
        setPublishTarget(null);
        setDoiInput('');
        setPublishError('');
      }}
      sheet={
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Formal publication</Text>
          <Text style={styles.sheetDesc}>
            Your paper is approved for the internal repository. If you have published it externally,
            enter your journal&apos;s DOI to request formal publication.
          </Text>

          <Input
            placeholder="e.g. 10.1234/example"
            value={doiInput}
            onChangeText={setDoiInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            containerStyle={styles.sheetInput}
          />

          {publishError ? (
            <View style={{ marginBottom: 16 }}>
              <InlineNotice tone="danger" message={publishError} />
            </View>
          ) : null}

          <Button
            label="Submit for validation"
            onPress={submitPublishRequest}
            loading={publishSubmitting}
          />
        </View>
      }
    >
      <Screen gutter={0} edges={{ bottom: false }}>
        <View style={styles.header}>
          <TopBar hideBell>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>My Papers</Text>
            </View>
          </TopBar>

          <View style={styles.searchRow}>
            <View style={styles.searchFlex}>
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder="Search your papers"
                accessibilityLabel="Search your papers"
                accessibilityHint="Filters your papers by title, author, or keyword"
              />
            </View>

            <FilterSelect
              label="Status"
              options={[
                { key: 'all', label: 'All' },
                { key: 'active', label: 'In Review' },
                { key: 'action', label: 'Needs Revision' },
                { key: 'approved', label: 'Approved' },
                { key: 'published', label: 'Published' },
              ]}
              value={activeFilter}
              defaultValue="all"
              onValueChange={(k) => setActiveFilter(k as FilterKey)}
            />
          </View>
        </View>

        <AtomicListPaint ready={!loading && filtered.length > 0} style={styles.listPaint}>
        <LegendList
          key={listEpochKey(loading || filtered.length === 0)}
          recycleItems={true}
          drawDistance={1500}
          maintainScrollAtEnd={false}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.brand.primary}
              colors={[theme.colors.brand.primary]}
            />
          }
          ListHeaderComponent={listHeaderElement}
          data={loading || filtered.length === 0 ? [] : filtered}
          keyExtractor={keyExtractor}
          estimatedItemSize={220}
          renderItem={renderPaperItem}
        />
        </AtomicListPaint>

        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => navigation.getParent()?.navigate('SubmitResearch')}
          accessibilityRole="button"
          accessibilityLabel="Submit research"
        >
          <Icon icon={Plus} size={24} color={theme.colors.text.onBrand} />
        </Pressable>
      </Screen>
    </SheetPresenter>
  );
};

/** Newest-first sort key: published, then submission, then created. */
const paperDateValue = (paper: ResearchPaper) =>
  paper.published_date || paper.submission_date || paper.created_at || 0;

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    listPaint: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.lg,
      paddingBottom: t.spacing['3xl'] + 120,
      gap: t.spacing.md,
      flexGrow: 1,
    },
    header: {
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.xl,
      paddingBottom: t.spacing.sm,
      gap: t.spacing.md,
      backgroundColor: t.colors.surface.raised,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.colors.border.subtle,
      zIndex: 10,
      ...t.shadows.level1,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
    },
    searchFlex: {
      flex: 1,
      minWidth: 0,
    },
    listHeader: {
      gap: t.spacing.md,
    },
    subbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: t.spacing.sm,
    },
    resultCount: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: t.colors.text.muted,
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    title: {
      fontFamily: t.fontFamilies.display.semibold,
      fontSize: 26,
      lineHeight: 32,
      color: t.colors.text.primary,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
      backgroundColor: t.colors.surface.sunken,
      borderRadius: t.radii.md,
      borderCurve: 'continuous',
      paddingHorizontal: t.spacing.md,
      height: 44,
    },
    searchInput: {
      flex: 1,
      ...t.typography.body,
      color: t.colors.text.primary,
      paddingVertical: 0,
      height: '100%',
    },
    pillContainer: {
      flexDirection: 'row',
      backgroundColor: t.colors.surface.sunken,
      borderRadius: 9999,
      borderCurve: 'continuous',
      padding: 4,
    },
    pillSegment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 9999,
      borderCurve: 'continuous',
    },
    pillSegmentLabel: {
      ...t.typography.label,
      color: t.colors.text.secondary,
      textAlign: 'center',
    },
    fab: {
      position: 'absolute',
      bottom: 104,
      right: t.spacing.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      borderCurve: 'continuous',
      backgroundColor: t.colors.brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...t.shadows.level2,
      zIndex: 50,
    },
    fabPressed: {
      backgroundColor: t.colors.brand.primaryPressed,
      transform: [{ scale: 0.96 }],
    },
    skeletonList: {
      gap: t.spacing.md,
    },
    list: {
      gap: t.spacing.md,
    },
    sheetContent: {
      paddingBottom: t.spacing.xl,
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.md,
    },
    sheetTitle: {
      ...t.typography.h3,
      color: t.colors.text.primary,
      marginBottom: t.spacing.xs,
    },
    sheetDesc: {
      ...t.typography.body,
      color: t.colors.text.secondary,
      marginBottom: t.spacing.lg,
    },
    sheetInput: {
      marginBottom: t.spacing.lg,
    },
  });
