import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { LegendList } from '@legendapp/list/react-native';

import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { researchApi } from '../../api/research';
import { Category, PaperStatus, ResearchPaper } from '../../types/domain';
import {
  buildCategoryColorById,
  buildCategoryNameById,
  resolveCategoryColor,
  resolveCategoryName,
} from '../../utils/category';
import { listEpochKey } from '../../utils/listEpochKey';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { motion, type Theme } from '../../theme';
import { StandardPaperCard } from '../../components/StandardPaperCard';
import { ListEntranceItem } from '../../components/ListEntranceItem';
import { Plus } from 'lucide-react-native';

import {
  REVISE_REQUIRED_STATUSES,
  ACTIVE_STATUSES,
} from '../../components/PaperStatusChip';
import {
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
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // DOI Publication Request State
  const [publishTarget, setPublishTarget] = useState<ResearchPaper | null>(null);
  const [doiInput, setDoiInput] = useState('');
  const [publishSubmitting, setPublishSubmitting] = useState(false);
  const [publishError, setPublishError] = useState('');

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent && papers.length === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const [papersResult, categoriesResult] = await Promise.allSettled([
        researchApi.getMyPapers({ forceRefresh: silent }),
        researchApi.getCategories({ forceRefresh: silent }),
      ]);

      if (papersResult.status === 'fulfilled') {
        setPapers(papersResult.value);
        setError('');
      } else {
        setError('Unable to load your papers.');
      }
      if (categoriesResult.status === 'fulfilled') {
        setCategories(categoriesResult.value);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [papers.length],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
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
        const keywords = Array.isArray(paper.keywords) ? paper.keywords.join(' ') : '';
        const target = `${paper.title} ${paper.abstract} ${keywords}`.toLowerCase();
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
      loadData(true); // silent refresh
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
    ({ item, index }: { item: ResearchPaper; index: number }) => (
      <ListEntranceItem index={index}>
        <StandardPaperCard
          paper={item}
          variant="papers"
          category={resolveCategoryName(item.category, categoryNameById)}
          categoryColor={resolveCategoryColor(item.category, categoryColorById)}
          onPress={() => handlePaperPress(item.id)}
          onRequestPublication={() => setPublishTarget(item)}
          onResubmit={() => handleResubmitPress(item.id)}
        />
      </ListEntranceItem>
    ),
    [categoryNameById, categoryColorById, handlePaperPress, handleResubmitPress],
  );

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData(true);
  }, [loadData]);

  // Atomic first paint: the list fades in as one motion once laid out,
  // instead of rows cascading in one-by-one over the stagger delays.
  const [firstPaintDone, setFirstPaintDone] = useState(false);
  const paintOpacity = useRef(new Animated.Value(0)).current;
  const handleListLayout = useCallback(() => {
    if (firstPaintDone) return;
    setFirstPaintDone(true);
    Animated.timing(paintOpacity, {
      toValue: 1,
      duration: motion.duration.base,
      useNativeDriver: true,
    }).start();
  }, [firstPaintDone, paintOpacity]);

  const keyExtractor = useCallback((item: ResearchPaper) => item.id, []);

  return (
    <SheetPresenter
      open={!!publishTarget}
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
            enter your journal's DOI to request formal publication.
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
          <TopBar variant="compact">
            <View style={styles.titleWrap}>
              <Text style={styles.title}>My Papers</Text>
            </View>
          </TopBar>

          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="Search your papers"
            accessibilityLabel="Search your papers"
            accessibilityHint="Filters your papers by title, abstract, or keywords"
          />

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

        <Animated.View
          style={[styles.listPaint, { opacity: paintOpacity }]}
          onLayout={handleListLayout}
        >
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
          ListHeaderComponent={() => (
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
                    query
                      ? 'Try adjusting your search terms.'
                      : "You haven't submitted any papers yet."
                  }
                />
              ) : null}
            </View>
          )}
          data={loading || filtered.length === 0 ? [] : filtered}
          keyExtractor={keyExtractor}
          estimatedItemSize={220}
          renderItem={renderPaperItem}
        />
        </Animated.View>

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
