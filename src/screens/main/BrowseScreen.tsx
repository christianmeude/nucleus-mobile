import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ListRenderItem } from 'react-native';
import Animated, {
  Easing,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui/Icon';
import { CloudOff, Library, Check } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LegendList } from '@legendapp/list/react-native';
import { ListEntranceItem } from '../../components/ListEntranceItem';

import { researchApi } from '../../api/research';
import { useAuth } from '../../context/AuthContext';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useHasSearchedOnce } from '../../hooks/useHasSearchedOnce';
import { useRecentSearches } from '../../hooks/useRecentSearches';
import { flags } from '../../config/flags';
import { Category, ResearchPaper } from '../../types/domain';
import { paperDate, getPrimaryAuthorName } from '../../utils/format';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { haptics } from '../../lib/haptics';
import {
  BottomSheet,
  EmptyState,
  InlineNotice,
  PressableScale,
  Screen,
  Skeleton,
  TopBar,
} from '../../components/ui';
import { buildCategoryNameById, resolveCategoryName } from '../../utils/category';

import { BrowseHeader } from './browse/BrowseHeader';
import { BrowseHero } from './browse/BrowseHero';
import { BrowseFilterBar } from './browse/BrowseFilterBar';
import { StandardPaperCard } from '../../components/StandardPaperCard';
import { BrowseGridCell } from './browse/BrowseGridCell';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

type ViewMode = 'list' | 'grid';

const GREETINGS = [
  'What are you researching today?',
  'What do you want to learn?',
  'Find your next reference.',
  'Search the repository.',
  "What's on your mind?",
  'Discover published research.',
  'Look something up.',
];

const pickGreeting = () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

const viewsOf = (paper: ResearchPaper) => paper.view_count || 0;
const timeOf = (paper: ResearchPaper) => new Date(paperDate(paper) || 0).getTime();

export const BrowseScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [tempYearFrom, setTempYearFrom] = useState('');
  const [tempYearTo, setTempYearTo] = useState('');
  const [yearError, setYearError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [yearSheetOpen, setYearSheetOpen] = useState(false);
  const [fieldSheetOpen, setFieldSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [searched, setSearched] = useState(false);
  const [greeting, setGreeting] = useState(pickGreeting);
  const [serverResults, setServerResults] = useState<ResearchPaper[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const progress = useSharedValue(0);

  const exploreReveal = useRef(false);
  const skipMorphAnim = useRef(false);
  const { recent, addRecent } = useRecentSearches();
  const { hasSearchedOnce, loaded: hasSearchedOnceLoaded, markSearchedOnce } = useHasSearchedOnce();

  const loadData = useCallback(async (silent = false) => {
    if (!silent && papers.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [publishedRows, categoryRows] = await Promise.all([
        researchApi.getPublishedPapers(undefined, { forceRefresh: silent }),
        researchApi.getCategories({ forceRefresh: silent }),
      ]);

      setPapers(publishedRows);
      setCategories(categoryRows);
      setError('');
    } catch (_error) {
      setError('Unable to load published papers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [papers.length]);

  useEffect(() => {
    loadData();
    setGreeting(pickGreeting());
  }, [loadData]);

  useEffect(() => {
    if (hasSearchedOnceLoaded && hasSearchedOnce) {
      skipMorphAnim.current = true;
      setSearched(true);
    }
  }, [hasSearchedOnceLoaded, hasSearchedOnce]);

  const paramCategoryId: string | undefined = route.params?.categoryId;
  useEffect(() => {
    if (!paramCategoryId) return;
    skipMorphAnim.current = true;
    setCategoryFilter(paramCategoryId);
    setSearched(true);
    navigation.setParams({ categoryId: undefined });
  }, [paramCategoryId, navigation]);

  useEffect(() => {
    if (skipMorphAnim.current) {
      progress.value = searched ? 1 : 0;
      skipMorphAnim.current = false;
      return;
    }
    if (searched && exploreReveal.current) {
      exploreReveal.current = false;
      progress.value = reducedMotion
        ? 1
        : withSpring(1, { damping: 16, stiffness: 190, velocity: 5 });
      return;
    }
    exploreReveal.current = false;
    progress.value = reducedMotion
      ? searched
        ? 1
        : 0
      : withTiming(searched ? 1 : 0, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [searched, progress, reducedMotion]);

  const spacerStyle = useAnimatedStyle(() => ({ flexGrow: 1 - progress.value }));
  const greetingStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const resultsStyle = useAnimatedStyle(() => ({
    flexGrow: progress.value,
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 24 }],
  }));

  const runSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      addRecent(trimmed);
      setQuery(trimmed);
      setSearched(true);
      markSearchedOnce();
      Keyboard.dismiss();
    },
    [addRecent, markSearchedOnce],
  );

  const submitSearch = useCallback(() => runSearch(query), [query, runSearch]);

  const debouncedQuery = useDebouncedValue(query.trim(), 350);
  const useServerSearch = flags.hybridSearch && debouncedQuery.length > 0;

  useEffect(() => {
    if (!useServerSearch) {
      setServerResults(null);
      setSearchError('');
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    researchApi
      .searchPapers(debouncedQuery, { yearFrom, yearTo })
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
  }, [useServerSearch, debouncedQuery, yearFrom, yearTo]);

  const commitExplore = useCallback(() => {
    exploreReveal.current = true;
    setSearched(true);
    markSearchedOnce();
  }, [markSearchedOnce]);

  const clearSearch = useCallback(() => {
    setQuery('');
    Keyboard.dismiss();
    if (!hasSearchedOnce) {
      setSearched(false);
      setGreeting(pickGreeting());
    }
  }, [hasSearchedOnce]);

  const categoryNameById = useMemo(() => buildCategoryNameById(categories), [categories]);

  const categoryColors = useMemo(
    () => [
      theme.colors.brand.primary,
      theme.palette.navy[300],
      theme.palette.navy[400],
      theme.palette.navy[600],
    ],
    [theme],
  );

  const categoryColorById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((item, index) => {
      map.set(item.id, categoryColors[index % categoryColors.length]);
    });
    return map;
  }, [categories, categoryColors]);

  const colorForCategory = useCallback(
    (value?: string | null) => {
      if (value && categoryColorById.has(value)) {
        return categoryColorById.get(value) as string;
      }
      return theme.colors.brand.primary;
    },
    [categoryColorById, theme],
  );

  const isFiltering = Boolean(query.trim() || categoryFilter);

  const matched = useMemo(() => {
    let rows = useServerSearch ? (serverResults ?? []) : papers;

    const yFrom = yearFrom ? parseInt(yearFrom, 10) : null;
    const yTo = yearTo ? parseInt(yearTo, 10) : null;

    return rows.filter((paper) => {
      if (categoryFilter && paper.category !== categoryFilter) {
        return false;
      }

      if (yFrom !== null || yTo !== null) {
        const dateValue = paperDate(paper);
        const paperYear = dateValue ? new Date(dateValue).getFullYear() : null;

        if (!paperYear) return false;
        if (yFrom !== null && paperYear < yFrom) return false;
        if (yTo !== null && paperYear > yTo) return false;
      }

      if (!useServerSearch) {
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
  }, [useServerSearch, serverResults, categoryFilter, papers, query, yearFrom, yearTo]);

  const sorted = useMemo(() => {
    if (useServerSearch) return matched;
    const arr = [...matched];
    arr.sort((left, right) => timeOf(right) - timeOf(left));
    return arr;
  }, [useServerSearch, matched]);

  const featured = useMemo(() => {
    if (isFiltering || papers.length === 0) return null;
    return [...papers].sort((left, right) => viewsOf(right) - viewsOf(left))[0] ?? null;
  }, [isFiltering, papers]);

  const gridItems = useMemo(() => {
    if (!featured) return sorted;
    return sorted.filter((paper) => paper.id !== featured.id);
  }, [featured, sorted]);

  const listData = loading || (useServerSearch && searchLoading) ? [] : gridItems;

  const openDetail = useCallback(
    (paperId: string) =>
      navigation.navigate(user?.role === 'faculty' ? 'FacultyPaperDetail' : 'ResearchDetail', {
        paperId,
      }),
    [navigation, user?.role],
  );

  const keyExtractor = useCallback((item: ResearchPaper) => item.id, []);

  const handleRefresh = useCallback(() => {
    haptics.light();
    loadData(true);
  }, [loadData]);

  const renderItem = useCallback(
    ({ item, index }: { item: ResearchPaper; index: number }) => {
      const categoryColor = colorForCategory(item.category);
      const categoryName = resolveCategoryName(item.category, categoryNameById);
      return (
        <ListEntranceItem index={index}>
          <Animated.View layout={reducedMotion ? undefined : LinearTransition.springify()}>
            {viewMode === 'grid' ? (
              <BrowseGridCell
                paper={item}
                category={categoryName}
                categoryColor={categoryColor}
                onOpen={openDetail}
              />
            ) : (
              <StandardPaperCard
                paper={item}
                variant="browse"
                category={categoryName}
                categoryColor={categoryColor}
                onPress={() => openDetail(item.id)}
              />
            )}
          </Animated.View>
        </ListEntranceItem>
      );
    },
    [viewMode, colorForCategory, categoryNameById, openDetail, reducedMotion],
  );

  let yearLabel = 'All Years';
  if (yearFrom && yearTo) yearLabel = `${yearFrom} - ${yearTo}`;
  else if (yearFrom) yearLabel = `From ${yearFrom}`;
  else if (yearTo) yearLabel = `Up to ${yearTo}`;

  const fieldLabel = categoryFilter
    ? (resolveCategoryName(categoryFilter, categoryNameById) ?? 'Field')
    : 'All fields';
  const showClear = searched || Boolean(query.trim());

  const listHeaderElement = (
    <>
      <Animated.View 
        layout={reducedMotion ? undefined : LinearTransition.springify()}
        style={styles.listHeader}
      >
        <BrowseFilterBar
          resultCount={sorted.length}
          fieldLabel={fieldLabel}
          yearLabel={yearLabel}
          viewMode={viewMode}
          onOpenFieldSheet={() => setFieldSheetOpen(true)}
          onOpenYearSheet={() => {
            setTempYearFrom(yearFrom);
            setTempYearTo(yearTo);
            setYearError('');
            setYearSheetOpen(true);
          }}
          onChangeViewMode={setViewMode}
        />

        {error ? <InlineNotice tone="danger" message={error} /> : null}

        {!loading && featured ? (
          <BrowseHero featured={featured} viewsOf={viewsOf} onOpen={openDetail} />
        ) : null}
      </Animated.View>
    </>
  );

  const listEmptyElement =
    loading || (useServerSearch && searchLoading) ? (
      <View style={styles.loadingWrap}>
        <Skeleton height={140} />
        <Skeleton height={84} />
        <Skeleton height={84} />
        <Skeleton height={84} />
      </View>
    ) : searchError ? (
      <EmptyState
        icon={<Icon icon={CloudOff} size={24} color={theme.colors.text.muted} />}
        title="Search unavailable"
        message={searchError}
      />
    ) : sorted.length === 0 ? (
      <EmptyState
        icon={<Icon icon={Library} size={24} color={theme.colors.text.muted} />}
        title="No papers found"
        message={
          query.trim() ? `No results for "${query.trim()}"` : 'No papers found in this category'
        }
      />
    ) : null;

  return (
    <>
      <Screen gutter={0} edges={{ top: false, bottom: false }}>
        <View
          style={[
            styles.root,
            { paddingTop: insets.top + theme.spacing.md, paddingBottom: insets.bottom },
          ]}
        >
          <TopBar />

          <Animated.View style={[styles.spacer, spacerStyle]} pointerEvents="none" />

          <BrowseHeader
            greeting={greeting}
            greetingStyle={greetingStyle as any}
            query={query}
            setQuery={setQuery}
            submitSearch={submitSearch}
            clearSearch={clearSearch}
            searched={searched}
            showClear={showClear}
            recent={recent}
            runSearch={runSearch}
            onExploreCommit={commitExplore}
            reducedMotion={reducedMotion}
          />

          <Animated.View style={[styles.resultsWrap, resultsStyle]}>
            <LegendList
              recycleItems={true}
              drawDistance={1500}
              style={styles.scroll}
              contentContainerStyle={styles.resultsContent}
              data={listData}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              numColumns={viewMode === 'grid' ? 2 : 1}
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
              estimatedItemSize={viewMode === 'grid' ? 160 : 84}
            />
          </Animated.View>

          <Animated.View style={[styles.spacer, spacerStyle]} pointerEvents="none" />
        </View>
      </Screen>

      <BottomSheet visible={yearSheetOpen} onClose={() => {
        setYearSheetOpen(false);
        setYearError('');
      }}>
        <Text style={styles.sheetTitle}>Filter by Year</Text>
        {!!yearError && (
          <Text style={{ color: theme.colors.state.danger, marginBottom: 12, ...theme.typography.caption }}>
            {yearError}
          </Text>
        )}
        <View style={styles.yearInputsRow}>
          <Input
            containerStyle={styles.yearInput}
            placeholder="From (e.g. 2020)"
            keyboardType="number-pad"
            maxLength={4}
            value={tempYearFrom}
            onChangeText={setTempYearFrom}
          />
          <Input
            containerStyle={styles.yearInput}
            placeholder="To (e.g. 2022)"
            keyboardType="number-pad"
            maxLength={4}
            value={tempYearTo}
            onChangeText={setTempYearTo}
          />
        </View>
        <View style={{ marginTop: 16 }}>
          <Button
            label="Apply Filter"
            onPress={() => {
              const fStr = tempYearFrom.trim();
              const tStr = tempYearTo.trim();
              const f = parseInt(fStr, 10);
              const t = parseInt(tStr, 10);
              
              if (fStr && tStr && !isNaN(f) && !isNaN(t) && f > t) {
                setYearError('"From" year cannot be greater than "To" year.');
                return;
              }
              
              setYearError('');
              setYearFrom(fStr);
              setYearTo(tStr);
              setYearSheetOpen(false);
            }}
          />
        </View>
        {(yearFrom || yearTo) && (
          <View style={{ marginTop: 8 }}>
            <Button
              label="Clear Year Filter"
              variant="subtle"
              onPress={() => {
                setYearError('');
                setYearFrom('');
                setYearTo('');
                setTempYearFrom('');
                setTempYearTo('');
                setYearSheetOpen(false);
              }}
            />
          </View>
        )}
      </BottomSheet>

      <BottomSheet visible={fieldSheetOpen} onClose={() => setFieldSheetOpen(false)}>
        <Text style={styles.sheetTitle}>Field</Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          style={styles.sheetScroll}
        >
          <PressableScale
            style={styles.sheetRow}
            onPress={() => {
              setCategoryFilter('');
              setFieldSheetOpen(false);
            }}
          >
            <Text style={[styles.sheetRowText, !categoryFilter ? styles.sheetRowActive : null]}>
              All fields
            </Text>
            {!categoryFilter ? (
              <Icon icon={Check} size={18} color={theme.colors.brand.primary} />
            ) : null}
          </PressableScale>
          {categories.map((category) => {
            const active = categoryFilter === category.id;
            return (
              <PressableScale
                key={category.id}
                style={styles.sheetRow}
                onPress={() => {
                  setCategoryFilter(category.id);
                  setFieldSheetOpen(false);
                }}
              >
                <Text
                  style={[styles.sheetRowText, active ? styles.sheetRowActive : null]}
                  numberOfLines={1}
                >
                  {category.name}
                </Text>
                {active ? <Icon icon={Check} size={18} color={theme.colors.brand.primary} /> : null}
              </PressableScale>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    spacer: {
      flexShrink: 1,
      flexBasis: 0,
    },
    resultsWrap: {
      flexBasis: 0,
      minHeight: 1,
      overflow: 'hidden',
    },
    scroll: {
      flex: 1,
    },
    resultsContent: {
      gap: theme.spacing.md,
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
    sheetTitle: {
      ...theme.typography.h3,
      color: theme.colors.text.primary,
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
      maxHeight: 360,
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
