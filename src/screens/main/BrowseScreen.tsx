import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Keyboard, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ListRenderItem } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui/Icon';

import { useNavigation, useRoute } from '@react-navigation/native';
import { LegendList } from '@legendapp/list/react-native';
import { ListEntranceItem } from '../../components/ListEntranceItem';

import { researchApi, submitApi, type DepartmentRow, type ProgramRow } from '../../api/research';
import { useAuth } from '../../context/AuthContext';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useRecentSearches } from '../../hooks/useRecentSearches';
import { flags } from '../../config/flags';
import { Category, ResearchPaper } from '../../types/domain';
import { paperDate, getPrimaryAuthorName } from '../../utils/format';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { haptics } from '../../lib/haptics';
import {
  BottomSheet,
  BottomSheetScrollView,
  BottomSheetTextInput,
  EmptyState,
  InlineNotice,
  PressableScale,
  Screen,
  Skeleton,
  TopBar,
} from '../../components/ui';
import {
  buildCategoryColorById,
  buildCategoryNameById,
  resolveCategoryColor,
  resolveCategoryName,
} from '../../utils/category';
import { listEpochKey } from '../../utils/listEpochKey';

import { BrowseHeader } from './browse/BrowseHeader';
import { BrowseControls } from './browse/BrowseControls';
import { BrowseFilterSystem } from './browse/BrowseFilterSystem';
import { BrowseFilterState, INITIAL_FILTER_STATE, getActiveFilterCount } from './browse/types';
import { StandardPaperCard } from '../../components/StandardPaperCard';
import { BrowseGridCell } from './browse/BrowseGridCell';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CloudOff, Landmark, Check } from 'lucide-react-native';

type ViewMode = 'list' | 'grid';

const timeOf = (paper: ResearchPaper) => new Date(paperDate(paper) || 0).getTime();

export const BrowseScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<BrowseFilterState>(INITIAL_FILTER_STATE);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [serverResults, setServerResults] = useState<ResearchPaper[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const { addRecent } = useRecentSearches();

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent && papers.length === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const [publishedRows, categoryRows, departmentRows, programRows] = await Promise.all([
          researchApi.getPublishedPapers(undefined, { forceRefresh: silent }),
          researchApi.getCategories({ forceRefresh: silent }),
          submitApi.getDepartments(),
          submitApi.getPrograms(),
        ]);

        setPapers(publishedRows);
        setCategories(categoryRows);
        setDepartments(departmentRows);
        setPrograms(programRows);
        setError('');
      } catch (_error) {
        setError('Unable to load published papers.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [papers.length],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const paramCategoryId: string | undefined = route.params?.categoryId;
  useEffect(() => {
    if (!paramCategoryId) return;
    setFilters((prev) => ({ ...prev, categories: [paramCategoryId] }));
    navigation.setParams({ categoryId: undefined });
  }, [paramCategoryId, navigation]);

  const runSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      addRecent(trimmed);
      setQuery(trimmed);
      Keyboard.dismiss();
    },
    [addRecent],
  );

  const submitSearch = useCallback(() => runSearch(query), [query, runSearch]);

  const debouncedQuery = useDebouncedValue(query.trim(), 350);
  const isTyping = query.trim() !== debouncedQuery;
  const useServerSearch = flags.hybridSearch && query.trim().length > 0;

  useEffect(() => {
    if (!flags.hybridSearch || debouncedQuery.length === 0) {
      setServerResults(null);
      setSearchError('');
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    researchApi
      .searchPapers(debouncedQuery, { yearFrom: filters.yearFrom, yearTo: filters.yearTo })
      .then((rows) => {
        if (cancelled) return;
        setServerResults(rows);
        setSearchError('');
      })
      .catch(() => {
        if (cancelled) return;
        setServerResults([]);
        setSearchError('Search is unavailable right now. Try again in a moment.');
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useServerSearch, debouncedQuery, filters.yearFrom, filters.yearTo]);

  const clearSearch = useCallback(() => {
    setQuery('');
    Keyboard.dismiss();
  }, []);

  const categoryNameById = useMemo(() => buildCategoryNameById(categories), [categories]);

  const categoryColorById = useMemo(() => buildCategoryColorById(categories), [categories]);

  const colorForCategory = useCallback(
    (value?: string | null) => resolveCategoryColor(value, categoryColorById),
    [categoryColorById],
  );

  const hasActiveFilters = getActiveFilterCount(filters) > 0;

  const matched = useMemo(() => {
    let rows = useServerSearch ? (serverResults ?? []) : papers;

    const yFrom = filters.yearFrom ? parseInt(filters.yearFrom, 10) : null;
    const yTo = filters.yearTo ? parseInt(filters.yearTo, 10) : null;

    return rows.filter((paper) => {
      if (
        filters.categories.length > 0 &&
        (!paper.category || !filters.categories.includes(paper.category))
      ) {
        return false;
      }

      if (
        filters.departments.length > 0 &&
        (!paper.department || !filters.departments.includes(paper.department))
      ) {
        return false;
      }

      if (
        filters.programs.length > 0 &&
        (!paper.program_id || !filters.programs.includes(paper.program_id))
      ) {
        return false;
      }

      if (yFrom !== null || yTo !== null) {
        const dateValue = paperDate(paper);
        const paperYear = dateValue ? new Date(dateValue).getFullYear() : null;

        if (!paperYear) return false;
        if (yFrom !== null && paperYear < yFrom) return false;
        if (yTo !== null && paperYear > yTo) return false;
      }

      if (!flags.hybridSearch) {
        const normalized = query.trim().toLowerCase();
        if (normalized) {
          const keywords = Array.isArray(paper.keywords) ? paper.keywords.join(' ') : '';
          const authorName = getPrimaryAuthorName(paper);
          const target = `${paper.title} ${paper.abstract} ${keywords} ${authorName}`.toLowerCase();
          if (!target.includes(normalized)) return false;
        }
      }

      return true;
    });
  }, [useServerSearch, serverResults, filters, papers, query]);

  const sorted = useMemo(() => {
    if (useServerSearch) return matched;
    const arr = [...matched];
    arr.sort((left, right) => timeOf(right) - timeOf(left));
    return arr;
  }, [useServerSearch, matched]);

  const gridItems = sorted;

  const listData = loading || (useServerSearch && searchLoading) ? [] : gridItems;

  const openDetail = useCallback(
    (paperId: string) =>
      navigation.navigate(user?.role === 'faculty' ? 'FacultyPaperDetail' : 'ResearchDetail', {
        paperId,
        from: 'browse',
      }),
    [navigation, user?.role],
  );

  const keyExtractor = useCallback((item: ResearchPaper) => item.id, []);

  const handleRefresh = useCallback(() => {
    haptics.light();
    loadData(true);
  }, [loadData]);

  const renderGridItem = useCallback(
    ({ item, index }: { item: ResearchPaper; index: number }) => {
      const categoryColor = colorForCategory(item.category);
      const categoryName = resolveCategoryName(item.category, categoryNameById);
      return (
        <BrowseGridCell
          paper={item}
          category={categoryName}
          categoryColor={categoryColor}
          onOpen={openDetail}
        />
      );
    },
    [colorForCategory, categoryNameById, openDetail],
  );

  const renderListItem = useCallback(
    ({ item, index }: { item: ResearchPaper; index: number }) => {
      const categoryColor = colorForCategory(item.category);
      const categoryName = resolveCategoryName(item.category, categoryNameById);
      return (
        <ListEntranceItem index={index}>
          <StandardPaperCard
            paper={item}
            variant="browse"
            category={categoryName}
            categoryColor={categoryColor}
            onPress={() => openDetail(item.id)}
          />
        </ListEntranceItem>
      );
    },
    [colorForCategory, categoryNameById, openDetail],
  );

  const showClear = Boolean(query.trim());

  const handleClearFilters = useCallback(() => {
    setFilters(INITIAL_FILTER_STATE);
  }, []);

  const listHeaderElement = (
    <>
      <View style={styles.listHeader}>
        <BrowseControls
          resultCount={sorted.length}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {error ? <InlineNotice tone="danger" message={error} /> : null}
      </View>
    </>
  );

  const listEmptyElement =
    loading || (useServerSearch && (searchLoading || isTyping)) ? (
      <View style={viewMode === 'grid' ? styles.loadingGridWrap : styles.loadingWrap}>
        {viewMode === 'grid' ? (
          <>
            <View style={styles.loadingGridRow}>
              <View style={styles.skeletonFlex}>
                <Skeleton height={148} />
              </View>
              <View style={styles.skeletonFlex}>
                <Skeleton height={148} />
              </View>
            </View>
            <View style={styles.loadingGridRow}>
              <View style={styles.skeletonFlex}>
                <Skeleton height={148} />
              </View>
              <View style={styles.skeletonFlex}>
                <Skeleton height={148} />
              </View>
            </View>
            <View style={styles.loadingGridRow}>
              <View style={styles.skeletonFlex}>
                <Skeleton height={148} />
              </View>
              <View style={styles.skeletonFlex}>
                <Skeleton height={148} />
              </View>
            </View>
          </>
        ) : (
          <>
            <Skeleton height={140} />
            <Skeleton height={84} />
            <Skeleton height={84} />
            <Skeleton height={84} />
          </>
        )}
      </View>
    ) : searchError ? (
      <EmptyState
        icon={<Icon icon={CloudOff} size={24} color={theme.colors.text.muted} />}
        title="Search unavailable"
        message={searchError}
      />
    ) : sorted.length === 0 ? (
      <EmptyState
        icon={<Icon icon={Landmark} size={24} color={theme.colors.text.muted} />}
        title="No papers found"
        message={
          query.trim() ? `No results for "${query.trim()}"` : 'No papers found in this category'
        }
      />
    ) : null;

  return (
    <>
      <Screen gutter={0} edges={{ top: false, bottom: false }}>
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <TopBar variant="compact">
              <View style={styles.titleWrap}>
                <Text style={styles.title}>Browse</Text>
              </View>
            </TopBar>

            <BrowseHeader
              query={query}
              setQuery={setQuery}
              submitSearch={submitSearch}
              clearSearch={clearSearch}
              showClear={showClear}
              filterNode={
                <BrowseFilterSystem
                  filters={filters}
                  onChange={setFilters}
                  categories={categories}
                  departments={departments}
                  programs={programs}
                />
              }
            />
          </View>

          <View style={styles.resultsWrap}>
            {viewMode === 'grid' ? (
              <LegendList
                key={`grid-${listEpochKey(listData.length === 0)}`}
                recycleItems={true}
                drawDistance={1500}
                style={styles.scroll}
                contentContainerStyle={styles.resultsContent}
                data={listData}
                keyExtractor={keyExtractor}
                renderItem={renderGridItem}
                numColumns={2}
                columnWrapperStyle={{ gap: theme.spacing.md }}
                ListHeaderComponent={listHeaderElement}
                ListEmptyComponent={listEmptyElement}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={theme.colors.brand.primary}
                    colors={[theme.colors.brand.primary]}
                  />
                }
                estimatedItemSize={160}
                getFixedItemSize={() => 148}
                getItemType={() => 'grid'}
              />
            ) : (
              <LegendList
                key={`list-${listEpochKey(listData.length === 0)}`}
                recycleItems={true}
                drawDistance={1500}
                style={styles.scroll}
                contentContainerStyle={styles.resultsContent}
                data={listData}
                keyExtractor={keyExtractor}
                renderItem={renderListItem}
                numColumns={1}
                ListHeaderComponent={listHeaderElement}
                ListEmptyComponent={listEmptyElement}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={theme.colors.brand.primary}
                    colors={[theme.colors.brand.primary]}
                  />
                }
                estimatedItemSize={84}
                getItemType={() => 'list'}
              />
            )}
          </View>
        </View>
      </Screen>
    </>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface.raised,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border.subtle,
      zIndex: 10,
      ...theme.shadows.level1,
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    title: {
      fontFamily: theme.fontFamilies.display.semibold,
      fontSize: 26,
      lineHeight: 32,
      color: theme.colors.text.primary,
    },
    spacer: {
      flexShrink: 1,
      flexBasis: 0,
    },
    resultsWrap: {
      flex: 1,
      overflow: 'hidden',
    },
    scroll: {
      flex: 1,
    },
    resultsContent: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl + 120,
    },
    listHeader: {
      gap: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    },
    loadingWrap: {
      gap: theme.spacing.md,
    },
    loadingGridWrap: {
      gap: theme.spacing.md,
    },
    loadingGridRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    skeletonFlex: {
      flex: 1,
    },
    sheetTitle: {
      ...theme.typography.h3,
      color: theme.colors.text.primary,
    },
    sheetIntro: {
      ...theme.typography.bodySmall,
      color: theme.colors.text.secondary,
      marginTop: -theme.spacing.xs,
    },
    sheetDeptText: {
      fontFamily: theme.fontFamilies.ui.semibold,
    },
    sheetProgramRow: {
      paddingLeft: theme.spacing.lg,
    },
    sheetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
      paddingVertical: theme.spacing.sm,
    },
    sheetRowText: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    sheetRowActive: {
      color: theme.colors.brand.primary,
      fontFamily: theme.fontFamilies.ui.semibold,
    },
    sheetScroll: {
      flex: 1,
    },
    yearInputsRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    yearInput: {
      flex: 1,
    },
  });
