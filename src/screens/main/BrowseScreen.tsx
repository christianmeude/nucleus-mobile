import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ListRenderItem } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { researchApi } from '../../api/research';
import { useAuth } from '../../context/AuthContext';
import { useHasSearchedOnce } from '../../hooks/useHasSearchedOnce';
import { useRecentSearches } from '../../hooks/useRecentSearches';
import { Category, ResearchPaper } from '../../types/domain';
import { formatDate, getPrimaryAuthorName, paperDate } from '../../utils/format';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { ResearchTile } from '../../components/ResearchTile';
import {
  BottomSheet,
  Chip,
  EmptyState,
  InlineNotice,
  PressableScale,
  Screen,
  Skeleton,
  TopBar,
} from '../../components/ui';
import { buildCategoryNameById, resolveCategoryName } from '../../utils/category';

type SortKey = 'newest' | 'most_viewed';
type ViewMode = 'list' | 'grid';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'most_viewed', label: 'Most viewed' },
];

/** Rotating landing prompts, one chosen at random each time the empty state shows. */
const GREETINGS = [
  'What are you researching today?',
  'What do you want to learn?',
  'Find your next reference.',
  'Search the repository.',
  "What's on your mind?",
  'Discover published research.',
  'Look something up.',
];

/** Static suggested-search terms for the first-run idle landing (Issue #37) —
 * populated regardless of personal history, distinct from the "Recent" row. */
const SUGGESTED_SEARCHES = [
  'Machine learning',
  'Mental health',
  'Climate change',
  'Data privacy',
  'Renewable energy',
  'Online learning',
];

const pickGreeting = () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

/** Swipe-up-and-hold explore gesture: full travel to commit, and the fraction
 * of that travel a release must clear to commit vs. spring back. */
const EXPLORE_DRAG_DISTANCE = 110;
const EXPLORE_COMMIT_THRESHOLD = 0.4;
const EXPLORE_ARROW_SIZE = 34;

const viewsOf = (paper: ResearchPaper) => paper.view_count || 0;
const timeOf = (paper: ResearchPaper) => new Date(paperDate(paper) || 0).getTime();

type BrowseStyles = ReturnType<typeof makeStyles>;

interface BrowseListCardProps {
  paper: ResearchPaper;
  categoryColor: string;
  categoryName: string | null;
  onOpen: (paperId: string) => void;
  styles: BrowseStyles;
}

/** Memoized list-mode row (Issue #38) — isolates re-renders from FlatList scroll churn. */
const BrowseListCard = memo(function BrowseListCard({
  paper,
  categoryColor,
  categoryName,
  onOpen,
  styles,
}: BrowseListCardProps) {
  const handlePress = useCallback(() => onOpen(paper.id), [onOpen, paper.id]);

  return (
    <PressableScale
      style={styles.card}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={paper.title || 'Untitled paper'}
    >
      <View style={styles.cardCatRow}>
        <View style={[styles.dot, { backgroundColor: categoryColor }]} />
        <Text style={[styles.cardCat, { color: categoryColor }]} numberOfLines={1}>
          {categoryName || 'Research'}
        </Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {paper.title}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        {getPrimaryAuthorName(paper)} · {formatDate(paperDate(paper))}
      </Text>
    </PressableScale>
  );
});

interface BrowseGridCellProps {
  paper: ResearchPaper;
  category: string | null;
  categoryColor: string;
  onOpen: (paperId: string) => void;
  styles: BrowseStyles;
}

/** Memoized grid-mode cell (Issue #38), wrapping the shared `ResearchTile`. */
const BrowseGridCell = memo(function BrowseGridCell({
  paper,
  category,
  categoryColor,
  onOpen,
  styles,
}: BrowseGridCellProps) {
  const handlePress = useCallback(() => onOpen(paper.id), [onOpen, paper.id]);

  return (
    <View style={styles.gridCell}>
      <ResearchTile
        paper={paper}
        category={category}
        categoryColor={categoryColor}
        onPress={handlePress}
      />
    </View>
  );
});

export const BrowseScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Search-first landing: `searched` gates the idle→results morph. It flips on
  // submit (Google-style) or the explore gesture, not on every keystroke.
  const [searched, setSearched] = useState(false);
  const [greeting, setGreeting] = useState(pickGreeting);
  const progress = useSharedValue(0);
  // Explore-gesture fill (0..1): drives the arrow's pull-to-refresh-style fill
  // while held. Deliberately independent of `progress` — the hold only shows
  // fill/arrow feedback, never scrubs the results reveal (Issue #36).
  const exploreFill = useSharedValue(0);
  const explorePop = useSharedValue(1);
  // Set when a committed explore-gesture release should drive the results
  // reveal with the fast-start/decelerate spring instead of the typed-search tween.
  const exploreReveal = useRef(false);
  // Set when a persisted flag forces `searched` without a user-initiated submit,
  // so the morph jumps instead of replaying either reveal animation.
  const skipMorphAnim = useRef(false);
  const { recent, addRecent } = useRecentSearches();
  const { hasSearchedOnce, loaded: hasSearchedOnceLoaded, markSearchedOnce } = useHasSearchedOnce();

  const loadData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [publishedRows, categoryRows] = await Promise.all([
        researchApi.getPublishedPapers(),
        researchApi.getCategories(),
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
  }, []);

  // Load in the background on focus so results are instant when the first search
  // fires; only rendering is gated on `searched`, never fetching. A fresh
  // greeting per focus gives the landing its varies-each-time feel.
  useFocusEffect(
    useCallback(() => {
      loadData();
      setGreeting(pickGreeting());
    }, [loadData]),
  );

  // Once the student has ever committed a search or explore gesture, Browse
  // never collapses back to the idle greeting again — it stays in results
  // mode (persisted until app cache is cleared).
  useEffect(() => {
    if (hasSearchedOnceLoaded && hasSearchedOnce) {
      skipMorphAnim.current = true;
      setSearched(true);
    }
  }, [hasSearchedOnceLoaded, hasSearchedOnce]);

  // Drive the whole transition off one shared value: 0 = idle, 1 = results.
  useEffect(() => {
    if (skipMorphAnim.current) {
      progress.value = searched ? 1 : 0;
      skipMorphAnim.current = false;
      return;
    }
    if (searched && exploreReveal.current) {
      exploreReveal.current = false;
      // Fast-start/ease-in-settle: high initial velocity, moderate damping —
      // distinct from the typed-search reveal's constant 420ms cubic tween (Issue #36).
      progress.value = reducedMotion ? 1 : withSpring(1, { damping: 16, stiffness: 190, velocity: 5 });
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
  const explorePopStyle = useAnimatedStyle(() => ({
    transform: [{ scale: explorePop.value }],
  }));
  const exploreFillStyle = useAnimatedStyle(() => ({
    height: exploreFill.value * EXPLORE_ARROW_SIZE,
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

  // Explore gesture commits into results mode with no query — browsing the
  // full unfiltered repository, same destination the hint card advertises.
  // `exploreReveal` is only ever flagged true here, on the JS thread — the
  // gesture's `.onEnd` worklet runs on the UI thread, where mutating a plain
  // ref does not propagate back to the JS-thread ref this closure captures.
  const commitExplore = useCallback(() => {
    exploreReveal.current = true;
    setSearched(true);
    markSearchedOnce();
  }, [markSearchedOnce]);

  const exploreGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          // Hold/drag only drives the fill feedback — results stay hidden
          // until a committed release (Issue #36).
          const travelled = Math.max(0, -event.translationY);
          exploreFill.value = Math.min(1, travelled / EXPLORE_DRAG_DISTANCE);
        })
        .onEnd(() => {
          const committed = exploreFill.value >= EXPLORE_COMMIT_THRESHOLD;
          if (committed) {
            if (reducedMotion) {
              exploreFill.value = 1;
            } else {
              exploreFill.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
              explorePop.value = withSequence(
                withTiming(1.3, { duration: 110, easing: Easing.out(Easing.quad) }),
                withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
              );
            }
            runOnJS(commitExplore)();
          } else if (reducedMotion) {
            exploreFill.value = 0;
          } else {
            exploreFill.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
          }
        }),
    [exploreFill, explorePop, commitExplore, reducedMotion],
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    Keyboard.dismiss();
    // Once explore mode has ever been entered, clearing the query stays in
    // results (now unfiltered) instead of collapsing back to the greeting.
    if (!hasSearchedOnce) {
      setSearched(false);
      setGreeting(pickGreeting());
    }
  }, [hasSearchedOnce]);

  const categoryNameById = useMemo(() => buildCategoryNameById(categories), [categories]);

  // Navy/blue shades for category dots — gold stays reserved for the featured hero.
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

  /** Papers matching the active category + search, before sorting. */
  const matched = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return papers
      .filter((paper) => {
        if (!categoryFilter) return true;
        return paper.category === categoryFilter;
      })
      .filter((paper) => {
        if (!normalized) return true;
        const keywords = Array.isArray(paper.keywords) ? paper.keywords.join(' ') : '';
        const authorName = getPrimaryAuthorName(paper);
        const target = `${paper.title} ${paper.abstract} ${keywords} ${authorName}`.toLowerCase();
        return target.includes(normalized);
      });
  }, [categoryFilter, papers, query]);

  const sorted = useMemo(() => {
    const arr = [...matched];
    if (sort === 'most_viewed') {
      arr.sort((left, right) => viewsOf(right) - viewsOf(left));
    } else {
      arr.sort((left, right) => timeOf(right) - timeOf(left));
    }
    return arr;
  }, [matched, sort]);

  /** Featured = most-viewed published paper, shown only on the unfiltered default view. */
  const featured = useMemo(() => {
    if (isFiltering || papers.length === 0) return null;
    return [...papers].sort((left, right) => viewsOf(right) - viewsOf(left))[0] ?? null;
  }, [isFiltering, papers]);

  const gridItems = useMemo(() => {
    if (!featured) return sorted;
    return sorted.filter((paper) => paper.id !== featured.id);
  }, [featured, sorted]);

  const listData = loading ? [] : gridItems;

  // Browse is shared by both roles. A faculty tap opens the faculty paper-detail
  // screen (registered on the faculty stack); a student tap opens the student
  // research-detail screen. Both routes take the same `{ paperId }`.
  const openDetail = useCallback(
    (paperId: string) =>
      navigation.navigate(
        user?.role === 'faculty' ? 'FacultyPaperDetail' : 'ResearchDetail',
        { paperId },
      ),
    [navigation, user?.role],
  );

  const keyExtractor = useCallback((item: ResearchPaper) => item.id, []);

  const renderItem: ListRenderItem<ResearchPaper> = useCallback(
    ({ item }) => {
      const categoryColor = colorForCategory(item.category);
      const categoryName = resolveCategoryName(item.category, categoryNameById);
      return viewMode === 'grid' ? (
        <BrowseGridCell
          paper={item}
          category={categoryName}
          categoryColor={categoryColor}
          onOpen={openDetail}
          styles={styles}
        />
      ) : (
        <BrowseListCard
          paper={item}
          categoryColor={categoryColor}
          categoryName={categoryName}
          onOpen={openDetail}
          styles={styles}
        />
      );
    },
    [viewMode, colorForCategory, categoryNameById, openDetail, styles],
  );

  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Newest';
  const showClear = searched || Boolean(query.trim());

  // Sort sheet trigger, category chips, and featured hero render as the
  // FlatList's header, not separately-scrolled content above it (Issue #38).
  const listHeaderElement = (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        <Chip
          label="All"
          variant="filter"
          active={!categoryFilter}
          onPress={() => setCategoryFilter('')}
        />
        {categories.map((category) => {
          const active = categoryFilter === category.id;
          return (
            <Chip
              key={category.id}
              label={category.name}
              variant="filter"
              active={active}
              onPress={() => setCategoryFilter(active ? '' : category.id)}
            />
          );
        })}
      </ScrollView>

      <View style={styles.subbar}>
        <Text style={styles.resultCount}>
          {sorted.length} {sorted.length === 1 ? 'Paper' : 'Papers'}
        </Text>
        <View style={styles.subbarRight}>
          <PressableScale
            style={styles.sortLink}
            onPress={() => setSortSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Sort: ${sortLabel}`}
          >
            <Text style={styles.sortLinkText}>{sortLabel}</Text>
            <Ionicons name="chevron-down" size={13} color={theme.colors.brand.primary} />
          </PressableScale>
          <View style={styles.viewToggle}>
            <PressableScale
              style={[styles.vt, viewMode === 'list' && styles.vtActive]}
              onPress={() => setViewMode('list')}
              accessibilityRole="button"
              accessibilityLabel="List view"
            >
              <Ionicons
                name="reorder-three-outline"
                size={17}
                color={viewMode === 'list' ? theme.colors.brand.primary : theme.colors.text.muted}
              />
            </PressableScale>
            <PressableScale
              style={[styles.vt, viewMode === 'grid' && styles.vtActive]}
              onPress={() => setViewMode('grid')}
              accessibilityRole="button"
              accessibilityLabel="Grid view"
            >
              <Ionicons
                name="grid-outline"
                size={15}
                color={viewMode === 'grid' ? theme.colors.brand.primary : theme.colors.text.muted}
              />
            </PressableScale>
          </View>
        </View>
      </View>

      {error ? <InlineNotice tone="danger" message={error} /> : null}

      {!loading && featured ? (
        <PressableScale
          style={styles.hero}
          onPress={() => openDetail(featured.id)}
          accessibilityRole="button"
          accessibilityLabel={`Featured paper: ${featured.title || 'Untitled paper'}`}
        >
          <View style={styles.heroRingLg} />
          <View style={styles.heroRingSm} />
          <Text style={styles.heroBadge}>Featured Paper</Text>
          <Text style={styles.heroTitle} numberOfLines={3}>
            {featured.title}
          </Text>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText} numberOfLines={1}>
              {getPrimaryAuthorName(featured)}
            </Text>
            <Text style={styles.heroMetaSep}>·</Text>
            <Text style={styles.heroMetaText}>{viewsOf(featured)} views</Text>
          </View>
        </PressableScale>
      ) : null}
    </>
  );

  const listEmptyElement = loading ? (
    <View style={styles.loadingWrap}>
      <Skeleton height={140} />
      <Skeleton height={84} />
      <Skeleton height={84} />
      <Skeleton height={84} />
    </View>
  ) : sorted.length === 0 ? (
    <EmptyState
      icon={<Ionicons name="library-outline" size={24} color={theme.colors.text.muted} />}
      title="No papers found"
      message={
        query.trim() ? `No results for "${query.trim()}"` : 'No papers found in this category'
      }
    />
  ) : null;

  return (
    <>
      {/* Both edges opted out of Screen's own inset padding: this screen computes
          its own top offset (insets.top + an extra breathing-room margin above
          TopBar) and its own bottom offset (plain insets.bottom, since the
          floating tab bar — not Screen — owns bottom clearance elsewhere). */}
      <Screen gutter={0} edges={{ top: false, bottom: false }}>
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + theme.spacing.md, paddingBottom: insets.bottom },
        ]}
      >
        <TopBar />

        <Animated.View style={[styles.spacer, spacerStyle]} pointerEvents="none" />

        <View style={styles.headerBlock}>
          <Animated.Text style={[styles.greeting, greetingStyle]} pointerEvents="none">
            {greeting}
          </Animated.Text>

          <View style={styles.searchWrap}>
            <Ionicons
              name="search-outline"
              size={18}
              color={theme.colors.text.muted}
              style={styles.searchIcon}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={submitSearch}
              returnKeyType="search"
              placeholder="Search papers, authors, keywords"
              placeholderTextColor={theme.colors.text.disabled}
              style={styles.searchInput}
              accessibilityLabel="Search papers"
              accessibilityHint="Filters published papers by title, author, or keyword"
            />
            <View
              pointerEvents={showClear ? 'auto' : 'none'}
              style={showClear ? styles.clearVisible : styles.clearHidden}
            >
              <Chip label="Clear" active={false} onPress={clearSearch} variant="filter" />
            </View>
          </View>

          {!searched && recent.length > 0 ? (
            <Animated.View style={[styles.recentRow, greetingStyle]} pointerEvents="box-none">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentRowContent}
                keyboardShouldPersistTaps="handled"
              >
                {recent.map((term, index) => (
                  <PressableScale
                    key={term}
                    style={styles.recentChip}
                    onPress={() => runSearch(term)}
                    accessibilityRole="button"
                    accessibilityLabel={`Search recent: ${term}`}
                  >
                    {index === 0 ? (
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={theme.colors.brand.primary}
                        style={styles.recentChipIcon}
                      />
                    ) : null}
                    <Text style={styles.recentChipText}>{term}</Text>
                  </PressableScale>
                ))}
              </ScrollView>
            </Animated.View>
          ) : null}

          {!searched ? (
            <Animated.View style={[styles.suggestedRow, greetingStyle]} pointerEvents="box-none">
              <Text style={styles.suggestedLabel}>Popular searches</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestedRowContent}
                keyboardShouldPersistTaps="handled"
              >
                {SUGGESTED_SEARCHES.map((term) => (
                  <PressableScale
                    key={term}
                    style={styles.suggestedChip}
                    onPress={() => runSearch(term)}
                    accessibilityRole="button"
                    accessibilityLabel={`Search suggested: ${term}`}
                  >
                    <Ionicons
                      name="trending-up-outline"
                      size={13}
                      color={theme.colors.text.secondary}
                      style={styles.suggestedChipIcon}
                    />
                    <Text style={styles.suggestedChipText}>{term}</Text>
                  </PressableScale>
                ))}
              </ScrollView>
            </Animated.View>
          ) : null}

          {!searched ? (
            <GestureDetector gesture={exploreGesture}>
              <Animated.View style={[styles.exploreHint, greetingStyle]}>
                <Animated.View style={[styles.exploreArrowTile, explorePopStyle]}>
                  <Ionicons name="arrow-up" size={18} color={theme.colors.brand.primary} />
                  <Animated.View
                    style={[styles.exploreArrowFillMask, exploreFillStyle]}
                    pointerEvents="none"
                  >
                    <View style={styles.exploreArrowFillInner}>
                      <Ionicons name="arrow-up" size={18} color={theme.colors.text.onBrand} />
                    </View>
                  </Animated.View>
                </Animated.View>
                <Text style={styles.exploreLabel}>Swipe up to browse papers</Text>
              </Animated.View>
            </GestureDetector>
          ) : null}
        </View>

        <Animated.View style={[styles.resultsWrap, resultsStyle]}>
          <FlatList
            key={viewMode}
            style={styles.scroll}
            contentContainerStyle={styles.resultsContent}
            data={listData}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            numColumns={viewMode === 'grid' ? 2 : 1}
            columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
            ListHeaderComponent={listHeaderElement}
            ListEmptyComponent={listEmptyElement}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadData(true)}
                tintColor={theme.colors.brand.primary}
                colors={[theme.colors.brand.primary]}
              />
            }
          />
        </Animated.View>

        <Animated.View style={[styles.spacer, spacerStyle]} pointerEvents="none" />
      </View>
      </Screen>

      <BottomSheet visible={sortSheetOpen} onClose={() => setSortSheetOpen(false)}>
        <Text style={styles.sheetTitle}>Sort by</Text>
        {SORT_OPTIONS.map((option) => {
          const active = sort === option.value;
          return (
            <PressableScale
              key={option.value}
              style={styles.sheetRow}
              onPress={() => {
                setSort(option.value);
                setSortSheetOpen(false);
              }}
            >
              <Text style={[styles.sheetRowText, active ? styles.sheetRowActive : null]}>
                {option.label}
              </Text>
              {active ? (
                <Ionicons name="checkmark" size={18} color={theme.colors.brand.primary} />
              ) : null}
            </PressableScale>
          );
        })}
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
  headerBlock: {
    position: 'relative',
  },
  greeting: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    textAlign: 'center',
    paddingBottom: theme.spacing.lg,
    fontFamily: theme.fontFamilies.display.semibold,
    fontSize: 24,
    lineHeight: 30,
    color: theme.colors.text.primary,
  },
  resultsWrap: {
    flexBasis: 0,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  resultsContent: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 0,
    backgroundColor: theme.colors.surface.raised,
  },
  searchInput: {
    flex: 1,
    height: 24,
    ...theme.typography.body,
    color: theme.colors.text.primary,
    paddingVertical: 0,
    textAlign: 'left',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  clearVisible: {
    marginLeft: theme.spacing.sm,
    width: 'auto',
    overflow: 'visible',
  },
  clearHidden: {
    width: 0,
    overflow: 'hidden',
  },
  recentRow: {
    marginTop: theme.spacing.md,
  },
  recentRowContent: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.brand.primarySoft,
  },
  recentChipIcon: {
    marginRight: 6,
  },
  recentChipText: {
    ...theme.typography.label,
    color: theme.colors.brand.primary,
  },
  suggestedRow: {
    marginTop: theme.spacing.md,
  },
  suggestedLabel: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.text.muted,
    marginBottom: theme.spacing.sm,
  },
  suggestedRowContent: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  suggestedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.subtle,
    backgroundColor: theme.colors.surface.raised,
  },
  suggestedChipIcon: {
    marginRight: 6,
  },
  suggestedChipText: {
    ...theme.typography.label,
    color: theme.colors.text.secondary,
  },
  exploreHint: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  exploreArrowTile: {
    width: EXPLORE_ARROW_SIZE,
    height: EXPLORE_ARROW_SIZE,
    borderRadius: 12,
    marginBottom: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand.primarySoft,
    overflow: 'hidden',
    position: 'relative',
  },
  exploreArrowFillMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: theme.colors.brand.primary,
  },
  exploreArrowFillInner: {
    width: EXPLORE_ARROW_SIZE,
    height: EXPLORE_ARROW_SIZE,
    position: 'absolute',
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreLabel: {
    fontFamily: theme.fontFamilies.ui.medium,
    fontSize: 12,
    color: theme.colors.text.muted,
    textAlign: 'center',
  },
  loadingWrap: {
    gap: theme.spacing.md,
  },
  hero: {
    backgroundColor: theme.colors.brand.primary,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.xl,
    overflow: 'hidden',
  },
  heroRingLg: {
    position: 'absolute',
    right: -30,
    bottom: -30,
    width: 120,
    height: 120,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  heroRingSm: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: 80,
    height: 80,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroBadge: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.colors.brand.accent,
    marginBottom: theme.spacing.sm,
  },
  heroTitle: {
    fontFamily: theme.fontFamilies.display.semibold,
    fontSize: 20,
    lineHeight: 26,
    color: theme.colors.text.onBrand,
    marginBottom: theme.spacing.md,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  heroMetaText: {
    ...theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    flexShrink: 1,
  },
  heroMetaSep: {
    ...theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  gridCell: {
    width: '48%',
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
  },
  sheetRowActive: {
    color: theme.colors.brand.primary,
    fontFamily: theme.fontFamilies.ui.semibold,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  subbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultCount: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.text.disabled,
  },
  subbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  sortLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortLinkText: {
    fontFamily: theme.fontFamilies.ui.medium,
    fontSize: 13,
    color: theme.colors.brand.primary,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface.sunken,
    borderRadius: theme.radii.pill,
    padding: 3,
    gap: 2,
  },
  vt: {
    width: 30,
    height: 26,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vtActive: {
    backgroundColor: theme.colors.surface.raised,
  },
  card: {
    backgroundColor: theme.colors.surface.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radii.lg,
    borderCurve: 'continuous',
    padding: theme.spacing.lg,
    gap: 6,
  },
  cardCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: theme.radii.pill,
  },
  cardCat: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    flex: 1,
  },
  cardTitle: {
    fontFamily: theme.fontFamilies.display.semibold,
    fontSize: 16,
    lineHeight: 21,
    color: theme.colors.text.primary,
  },
  cardMeta: {
    fontFamily: theme.fontFamilies.ui.regular,
    fontSize: 12,
    color: theme.colors.text.muted,
  },
});
