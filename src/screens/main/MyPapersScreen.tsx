import { useCallback, useMemo, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { LegendList } from '@legendapp/list/react-native';

import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { researchApi } from '../../api/research';
import { Category, PaperStatus, ResearchPaper } from '../../types/domain';
import { buildCategoryNameById, resolveCategoryName } from '../../utils/category';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { StandardPaperCard } from '../../components/StandardPaperCard';
import { ListEntranceItem } from '../../components/ListEntranceItem';
import { Plus } from 'lucide-react-native';

import {
  REVISE_REQUIRED_STATUSES,
  ACTIVE_STATUSES,
  PUBLISHED_STATUSES,
} from '../../components/PaperStatusChip';
import {
  EmptyState,
  Icon,
  InlineNotice,
  Screen,
  SearchField,
  SegmentedControl,
  Skeleton,
  TopBar,
  BottomSheet,
  Button,
  SheetPresenter,
  BottomSheetTextInput,
} from '../../components/ui';

type FilterKey = 'all' | 'active' | 'published' | 'action';

const isFilterMatch = (status: PaperStatus, filter: FilterKey) => {
  if (filter === 'all') return true;
  if (filter === 'active') return ACTIVE_STATUSES.has(status);
  if (filter === 'published') return PUBLISHED_STATUSES.has(status);
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

  const loadData = useCallback(async (silent = false) => {
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
  }, [papers.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryNameById = useMemo(() => buildCategoryNameById(categories), [categories]);

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

  const subtitle = useMemo(() => {
    const total = papers.length;
    if (total === 0) return 'No submissions yet';
    const needsAttention = papers.filter((p) => REVISE_REQUIRED_STATUSES.has(p.status)).length;
    const base = `${total} submission${total === 1 ? '' : 's'}`;
    if (needsAttention === 0) return base;
    return `${base} · ${needsAttention} need${needsAttention === 1 ? 's' : ''} your attention`;
  }, [papers]);

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

  const handlePaperPress = useCallback((paperId: string) => {
    navigation.navigate('ResearchDetail', { paperId });
  }, [navigation]);

  const renderPaperItem = useCallback(({ item, index }: { item: ResearchPaper; index: number }) => (
    <ListEntranceItem index={index}>
      <StandardPaperCard
        paper={item}
        variant="papers"
        category={resolveCategoryName(item.category, categoryNameById)}
        onPress={() => handlePaperPress(item.id)}
        onRequestPublication={() => setPublishTarget(item)}
      />
    </ListEntranceItem>
  ), [categoryNameById, handlePaperPress]);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData(true);
  }, [loadData]);

  const keyExtractor = useCallback((item: ResearchPaper) => item.id, []);

  return (
    <Screen gutter={0} edges={{ bottom: false }}>
      <View style={styles.header}>
        <TopBar variant="compact">
          <View style={styles.titleWrap}>
            <Text style={styles.title}>My Papers</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </TopBar>

        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search your papers"
          accessibilityLabel="Search papers"
          accessibilityHint="Filters your papers by title, abstract, or keywords"
        />

        <SegmentedControl
          options={[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'In Review' },
            { key: 'action', label: 'Needs Revision' },
            { key: 'published', label: 'Approved' },
          ]}
          value={activeFilter}
          onValueChange={(k) => setActiveFilter(k as FilterKey)}
        />
      </View>

      <LegendList
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

            {error ? <InlineNotice tone="danger" message={error} /> : null}

            {loading ? (
              <View style={styles.skeletonList}>
                <Skeleton height={104} />
                <Skeleton height={104} />
                <Skeleton height={104} />
              </View>
            ) : filtered.length === 0 ? (
              <EmptyState context={papers.length === 0 ? 'no-papers' : 'no-results'} />
            ) : null}
          </View>
        )}
        data={loading || filtered.length === 0 ? [] : filtered}
        keyExtractor={keyExtractor}
        estimatedItemSize={104}
        renderItem={renderPaperItem}
      />
      
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => navigation.getParent()?.navigate('SubmitResearch')}
        accessibilityRole="button"
        accessibilityLabel="Submit research"
      >
        <Icon icon={Plus} size={24} color={theme.colors.text.onBrand} />
      </Pressable>

      <SheetPresenter
        visible={!!publishTarget}
        onClose={() => {
          setPublishTarget(null);
          setDoiInput('');
          setPublishError('');
        }}
      >
        <BottomSheet
          title="Formal publication"
          onClose={() => {
            setPublishTarget(null);
            setDoiInput('');
            setPublishError('');
          }}
        >
          <View style={styles.sheetContent}>
            <Text style={styles.sheetDesc}>
              Your paper is approved for the internal repository. If you have published it externally, enter your journal's DOI to request formal publication.
            </Text>

            <BottomSheetTextInput
              placeholder="e.g. 10.1234/example"
              value={doiInput}
              onChangeText={setDoiInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              containerStyle={styles.sheetInput}
            />

            {publishError ? (
              <InlineNotice tone="danger" message={publishError} style={{ marginBottom: 16 }} />
            ) : null}

            <Button
              label="Submit for validation"
              onPress={submitPublishRequest}
              loading={publishSubmitting}
            />
          </View>
        </BottomSheet>
      </SheetPresenter>
    </Screen>
  );
};

/** Newest-first sort key: published, then submission, then created. */
const paperDateValue = (paper: ResearchPaper) =>
  paper.published_date || paper.submission_date || paper.created_at || 0;

const makeStyles = (t: Theme) =>
  StyleSheet.create({
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
    },
    listHeader: {
      gap: t.spacing.md,
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
    subtitle: {
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 13,
      color: t.colors.text.muted,
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
