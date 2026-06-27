import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { researchApi } from '../../api/research';
import { Category, ResearchPaper } from '../../types/domain';
import { getPrimaryAuthorName, paperDate } from '../../utils/format';
import { theme } from '../../theme';
import { ResearchTile } from '../../components/ResearchTile';
import { BottomSheet, Chip, EmptyState, InlineNotice, Skeleton } from '../../components/ui';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SortKey = 'newest' | 'most_viewed';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'most_viewed', label: 'Most viewed' },
];

/** Navy/blue shades for category dots — gold stays reserved for the featured hero. */
const CATEGORY_COLORS = [
  theme.colors.brand.primary,
  theme.palette.navy[300],
  theme.palette.navy[400],
  theme.palette.navy[600],
];

const viewsOf = (paper: ResearchPaper) => paper.view_count || 0;
const timeOf = (paper: ResearchPaper) => new Date(paperDate(paper) || 0).getTime();

export const BrowseScreen = () => {
  const navigation = useNavigation<any>();
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const categoryNameById = useMemo(() => {
    return new Map(categories.map((item) => [item.id, item.name]));
  }, [categories]);

  const categoryColorById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((item, index) => {
      map.set(item.id, CATEGORY_COLORS[index % CATEGORY_COLORS.length]);
    });
    return map;
  }, [categories]);

  /** Display-only category name, UUID-guarded (Issue #5). Null when nothing resolves. */
  const categoryNameForDisplay = useCallback(
    (value?: string | null): string | null => {
      if (!value) return null;
      if (categoryNameById.has(value)) {
        const name = categoryNameById.get(value);
        if (!name || !name.trim()) return null;
        return name;
      }
      if (!UUID_PATTERN.test(value)) return value;
      return null;
    },
    [categoryNameById]
  );

  const colorForCategory = useCallback(
    (value?: string | null) => {
      if (value && categoryColorById.has(value)) {
        return categoryColorById.get(value) as string;
      }
      return theme.colors.brand.primary;
    },
    [categoryColorById]
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
    [navigation]
  );

  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Newest';

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        }
      >
        <Text style={styles.title}>Browse</Text>

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
            placeholder="Search papers, authors, keywords"
            placeholderTextColor={theme.colors.text.disabled}
            style={styles.searchInput}
            accessibilityLabel="Search papers"
            accessibilityHint="Filters published papers by title, author, or keyword"
          />
          <View
            pointerEvents={query.trim() ? 'auto' : 'none'}
            style={query.trim() ? styles.clearVisible : styles.clearHidden}
          >
            <Chip label="Clear" active={false} onPress={() => setQuery('')} variant="filter" />
          </View>
        </View>

        <View style={styles.filterBar}>
          <Pressable
            style={styles.filterBtn}
            onPress={() => setFilterSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Filters"
          >
            <Ionicons name="options-outline" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.filterBtnText}>Filters</Text>
            {categoryFilter ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>1</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            style={styles.sortBtn}
            onPress={() => setSortSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Sort: ${sortLabel}`}
          >
            <Text style={styles.sortLabel}>Sort: </Text>
            <Text style={styles.sortValue}>{sortLabel}</Text>
            <Ionicons name="chevron-down" size={14} color={theme.colors.brand.primary} />
          </Pressable>
        </View>

        {error ? <InlineNotice tone="danger" message={error} /> : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton height={148} />
            <View style={styles.grid}>
              {[0, 1, 2, 3].map((key) => (
                <View key={key} style={styles.gridCell}>
                  <Skeleton height={132} />
                </View>
              ))}
            </View>
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

            <Text style={styles.rowHead}>
              {sorted.length} {sorted.length === 1 ? 'Paper' : 'Papers'}
            </Text>

            <View style={styles.grid}>
              {gridItems.map((paper) => (
                <View key={paper.id} style={styles.gridCell}>
                  <ResearchTile
                    paper={paper}
                    category={categoryNameForDisplay(paper.category)}
                    categoryColor={colorForCategory(paper.category)}
                    onPress={() => openDetail(paper.id)}
                  />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <BottomSheet visible={filterSheetOpen} onClose={() => setFilterSheetOpen(false)}>
        <Text style={styles.sheetTitle}>Category</Text>
        <ScrollView style={styles.sheetScroll}>
          <Pressable
            style={styles.sheetRow}
            onPress={() => {
              setCategoryFilter('');
              setFilterSheetOpen(false);
            }}
          >
            <Text style={[styles.sheetRowText, !categoryFilter ? styles.sheetRowActive : null]}>
              All categories
            </Text>
            {!categoryFilter ? (
              <Ionicons name="checkmark" size={18} color={theme.colors.brand.primary} />
            ) : null}
          </Pressable>
          {categories.map((category) => {
            const active = categoryFilter === category.id;
            return (
              <Pressable
                key={category.id}
                style={styles.sheetRow}
                onPress={() => {
                  setCategoryFilter(category.id);
                  setFilterSheetOpen(false);
                }}
              >
                <Text style={[styles.sheetRowText, active ? styles.sheetRowActive : null]}>
                  {category.name}
                </Text>
                {active ? (
                  <Ionicons name="checkmark" size={18} color={theme.colors.brand.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface.base,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.border.strong,
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
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    height: 36,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.strong,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surface.raised,
  },
  filterBtnText: {
    ...theme.typography.label,
    color: theme.colors.text.secondary,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.text.onBrand,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: theme.spacing.sm,
  },
  sortLabel: {
    ...theme.typography.metadata,
    color: theme.colors.text.muted,
  },
  sortValue: {
    ...theme.typography.metadata,
    color: theme.colors.brand.primary,
    marginRight: theme.spacing.xs,
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
  rowHead: {
    ...theme.typography.metadata,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: theme.colors.text.muted,
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
  sheetScroll: {
    maxHeight: 320,
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
});
