import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { researchApi } from '../../api/research';
import { Category, ResearchPaper } from '../../types/domain';
import { formatDate, getPrimaryAuthorName, paperDate } from '../../utils/format';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { ResearchTile } from '../../components/ResearchTile';
import { BottomSheet, Chip, EmptyState, InlineNotice, Skeleton } from '../../components/ui';
import { buildCategoryNameById, resolveCategoryName } from '../../utils/category';

type SortKey = 'newest' | 'most_viewed';

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

const pickGreeting = () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

const viewsOf = (paper: ResearchPaper) => paper.view_count || 0;
const timeOf = (paper: ResearchPaper) => new Date(paperDate(paper) || 0).getTime();

export const BrowseScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Search-first landing: `searched` gates the idle→results morph. It flips on
  // submit (Google-style), not on every keystroke; the Clear control resets it.
  const [searched, setSearched] = useState(false);
  const [greeting, setGreeting] = useState(pickGreeting);
  const progress = useSharedValue(0);

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

  // Drive the whole transition off one shared value: 0 = idle, 1 = results.
  useEffect(() => {
    progress.value = withTiming(searched ? 1 : 0, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [searched, progress]);

  const spacerStyle = useAnimatedStyle(() => ({ flexGrow: 1 - progress.value }));
  const greetingStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const resultsStyle = useAnimatedStyle(() => ({
    flexGrow: progress.value,
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 24 }],
  }));

  const submitSearch = useCallback(() => {
    if (query.trim()) {
      setSearched(true);
      Keyboard.dismiss();
    }
  }, [query]);

  const resetToIdle = useCallback(() => {
    setQuery('');
    setSearched(false);
    setGreeting(pickGreeting());
    Keyboard.dismiss();
  }, []);

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

  const openDetail = useCallback(
    (paperId: string) => navigation.navigate('ResearchDetail', { paperId }),
    [navigation],
  );

  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Newest';
  const showClear = searched || Boolean(query.trim());

  return (
    <>
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + theme.spacing.md, paddingBottom: insets.bottom },
        ]}
      >
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
              <Chip label="Clear" active={false} onPress={resetToIdle} variant="filter" />
            </View>
          </View>
        </View>

        <Animated.View style={[styles.resultsWrap, resultsStyle]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.resultsContent}
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
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <Pressable
                style={[styles.topicChip, !categoryFilter && styles.topicChipActive]}
                onPress={() => setCategoryFilter('')}
                accessibilityRole="button"
                accessibilityLabel="All categories"
              >
                <Text style={[styles.topicChipText, !categoryFilter && styles.topicChipTextActive]}>
                  All
                </Text>
              </Pressable>
              {categories.map((category) => {
                const active = categoryFilter === category.id;
                return (
                  <Pressable
                    key={category.id}
                    style={[styles.topicChip, active && styles.topicChipActive]}
                    onPress={() => setCategoryFilter(active ? '' : category.id)}
                    accessibilityRole="button"
                    accessibilityLabel={category.name}
                  >
                    <Text style={[styles.topicChipText, active && styles.topicChipTextActive]}>
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.subbar}>
              <Text style={styles.resultCount}>
                {sorted.length} {sorted.length === 1 ? 'Paper' : 'Papers'}
              </Text>
              <View style={styles.subbarRight}>
                <Pressable
                  style={styles.sortLink}
                  onPress={() => setSortSheetOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort: ${sortLabel}`}
                >
                  <Text style={styles.sortLinkText}>{sortLabel}</Text>
                  <Ionicons name="chevron-down" size={13} color={theme.colors.brand.primary} />
                </Pressable>
                <View style={styles.viewToggle}>
                  <Pressable
                    style={[styles.vt, viewMode === 'list' && styles.vtActive]}
                    onPress={() => setViewMode('list')}
                    accessibilityRole="button"
                    accessibilityLabel="List view"
                  >
                    <Ionicons
                      name="reorder-three-outline"
                      size={17}
                      color={
                        viewMode === 'list' ? theme.colors.brand.primary : theme.colors.text.muted
                      }
                    />
                  </Pressable>
                  <Pressable
                    style={[styles.vt, viewMode === 'grid' && styles.vtActive]}
                    onPress={() => setViewMode('grid')}
                    accessibilityRole="button"
                    accessibilityLabel="Grid view"
                  >
                    <Ionicons
                      name="grid-outline"
                      size={15}
                      color={
                        viewMode === 'grid' ? theme.colors.brand.primary : theme.colors.text.muted
                      }
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            {error ? <InlineNotice tone="danger" message={error} /> : null}

            {loading ? (
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
                  query.trim()
                    ? `No results for "${query.trim()}"`
                    : 'No papers found in this category'
                }
              />
            ) : (
              <>
                {featured ? (
                  <Pressable
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
                  </Pressable>
                ) : null}

                {viewMode === 'grid' ? (
                  <View style={styles.grid}>
                    {gridItems.map((paper) => (
                      <View key={paper.id} style={styles.gridCell}>
                        <ResearchTile
                          paper={paper}
                          category={resolveCategoryName(paper.category, categoryNameById)}
                          categoryColor={colorForCategory(paper.category)}
                          onPress={() => openDetail(paper.id)}
                        />
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.list}>
                    {gridItems.map((paper) => {
                      const categoryColor = colorForCategory(paper.category);
                      const categoryName = resolveCategoryName(paper.category, categoryNameById);
                      return (
                        <Pressable
                          key={paper.id}
                          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                          onPress={() => openDetail(paper.id)}
                          accessibilityRole="button"
                          accessibilityLabel={paper.title || 'Untitled paper'}
                        >
                          <View style={styles.cardCatRow}>
                            <View style={[styles.dot, { backgroundColor: categoryColor }]} />
                            <Text
                              style={[styles.cardCat, { color: categoryColor }]}
                              numberOfLines={1}
                            >
                              {categoryName || 'Research'}
                            </Text>
                          </View>
                          <Text style={styles.cardTitle} numberOfLines={2}>
                            {paper.title}
                          </Text>
                          <Text style={styles.cardMeta} numberOfLines={1}>
                            {getPrimaryAuthorName(paper)} · {formatDate(paperDate(paper))}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </Animated.View>

        <Animated.View style={[styles.spacer, spacerStyle]} pointerEvents="none" />
      </View>

      <BottomSheet visible={sortSheetOpen} onClose={() => setSortSheetOpen(false)}>
        <Text style={styles.sheetTitle}>Sort by</Text>
        {SORT_OPTIONS.map((option) => {
          const active = sort === option.value;
          return (
            <Pressable
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
            </Pressable>
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
    backgroundColor: theme.colors.surface.base,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.spacing.md,
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
  topicChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.subtle,
    backgroundColor: theme.colors.surface.raised,
  },
  topicChipActive: {
    backgroundColor: theme.colors.brand.primary,
    borderColor: theme.colors.brand.primary,
  },
  topicChipText: {
    fontFamily: theme.fontFamilies.ui.medium,
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  topicChipTextActive: {
    color: theme.colors.text.onBrand,
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
  list: {
    gap: theme.spacing.sm,
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
  cardPressed: {
    opacity: 0.7,
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
