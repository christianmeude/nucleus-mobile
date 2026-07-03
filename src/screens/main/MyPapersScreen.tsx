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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { researchApi } from '../../api/research';
import { Category, PaperStatus, ResearchPaper } from '../../types/domain';
import { buildCategoryNameById, resolveCategoryName } from '../../utils/category';
import { theme } from '../../theme';
import { MyPaperCard } from '../../components/MyPaperCard';
import { ListEntranceItem } from '../../components/ListEntranceItem';
import {
  ACTION_STATUSES,
  ACTIVE_STATUSES,
  PUBLISHED_STATUSES,
} from '../../components/PaperStatusChip';
import { Chip, EmptyState, InlineNotice, Skeleton } from '../../components/ui';

type FilterKey = 'all' | 'active' | 'published' | 'action';

const isFilterMatch = (status: PaperStatus, filter: FilterKey) => {
  if (filter === 'all') return true;
  if (filter === 'active') return ACTIVE_STATUSES.has(status);
  if (filter === 'published') return PUBLISHED_STATUSES.has(status);
  return ACTION_STATUSES.has(status);
};

export const MyPapersScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    const [papersResult, categoriesResult] = await Promise.allSettled([
      researchApi.getMyPapers(),
      researchApi.getCategories(),
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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
    const needsAttention = papers.filter((p) => ACTION_STATUSES.has(p.status)).length;
    const base = `${total} submission${total === 1 ? '' : 's'}`;
    if (needsAttention === 0) return base;
    return `${base} · ${needsAttention} need${needsAttention === 1 ? 's' : ''} your attention`;
  }, [papers]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Papers</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={theme.colors.text.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your papers"
            placeholderTextColor={theme.colors.text.disabled}
            style={styles.searchInput}
            accessibilityLabel="Search papers"
            accessibilityHint="Filters your papers by title, abstract, or keywords"
          />
          {query ? (
            <Chip label="Clear" active={false} onPress={() => setQuery('')} variant="filter" />
          ) : null}
        </View>

        <View style={styles.filters}>
          <Chip
            label="All"
            variant="filter"
            active={activeFilter === 'all'}
            onPress={() => setActiveFilter('all')}
          />
          <Chip
            label="In review"
            variant="filter"
            active={activeFilter === 'active'}
            onPress={() => setActiveFilter('active')}
            tone="info"
          />
          <Chip
            label="Needs revision"
            variant="filter"
            active={activeFilter === 'action'}
            onPress={() => setActiveFilter('action')}
            tone="warning"
          />
          <Chip
            label="Published"
            variant="filter"
            active={activeFilter === 'published'}
            onPress={() => setActiveFilter('published')}
            tone="success"
          />
        </View>

        {error ? <InlineNotice tone="danger" message={error} /> : null}

        {loading ? (
          <View style={styles.skeletonList}>
            <Skeleton height={104} />
            <Skeleton height={104} />
            <Skeleton height={104} />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="folder-open-outline" size={24} color={theme.colors.text.muted} />}
            title="No papers found"
            message={
              papers.length === 0
                ? 'Submit your first research paper to see it here.'
                : 'No papers match your current filter.'
            }
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((paper, index) => (
              <ListEntranceItem key={paper.id} index={index}>
                <MyPaperCard
                  paper={paper}
                  category={resolveCategoryName(paper.category, categoryNameById)}
                  onPress={() => navigation.navigate('ResearchDetail', { paperId: paper.id })}
                />
              </ListEntranceItem>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => navigation.navigate('SubmitResearch')}
        accessibilityRole="button"
        accessibilityLabel="Submit new research"
      >
        <Ionicons name="add" size={20} color={theme.colors.text.onBrand} />
        <Text style={styles.fabText}>Submit</Text>
      </Pressable>
    </View>
  );
};

/** Newest-first sort key: published, then submission, then created. */
const paperDateValue = (paper: ResearchPaper) =>
  paper.published_date || paper.submission_date || paper.created_at || 0;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface.base,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['3xl'] + 56,
    gap: theme.spacing.md,
  },
  header: {
    gap: 2,
  },
  title: {
    fontFamily: theme.fontFamilies.display.semibold,
    fontSize: 26,
    lineHeight: 32,
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontFamily: theme.fontFamilies.ui.regular,
    fontSize: 13,
    color: theme.colors.text.muted,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface.sunken,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text.primary,
    paddingVertical: 0,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  skeletonList: {
    gap: theme.spacing.lg,
  },
  list: {
    gap: theme.spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: theme.spacing.xl,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radii.pill,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.brand.accent,
    shadowColor: theme.colors.brand.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  fabPressed: {
    opacity: 0.85,
  },
  fabText: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 15,
    color: theme.colors.text.onBrand,
  },
});
