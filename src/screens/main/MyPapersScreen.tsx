import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LegendList } from '@legendapp/list/react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { researchApi } from '../../api/research';
import { Category, PaperStatus, ResearchPaper } from '../../types/domain';
import { buildCategoryNameById, resolveCategoryName } from '../../utils/category';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { MyPaperCard } from '../../components/MyPaperCard';
import { ListEntranceItem } from '../../components/ListEntranceItem';
import {
  ACTION_STATUSES,
  ACTIVE_STATUSES,
  PUBLISHED_STATUSES,
} from '../../components/PaperStatusChip';
import { Chip, EmptyState, InlineNotice, Screen, Skeleton, TopBar } from '../../components/ui';

type FilterKey = 'all' | 'active' | 'published' | 'action';

const isFilterMatch = (status: PaperStatus, filter: FilterKey) => {
  if (filter === 'all') return true;
  if (filter === 'active') return ACTIVE_STATUSES.has(status);
  if (filter === 'published') return PUBLISHED_STATUSES.has(status);
  return ACTION_STATUSES.has(status);
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
    const needsAttention = papers.filter((p) => ACTION_STATUSES.has(p.status)).length;
    const base = `${total} submission${total === 1 ? '' : 's'}`;
    if (needsAttention === 0) return base;
    return `${base} · ${needsAttention} need${needsAttention === 1 ? 's' : ''} your attention`;
  }, [papers]);

  return (
    <Screen edges={{ bottom: false }}>
      <LegendList
        recycleItems={false}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        }
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <TopBar>
              <Text style={styles.title}>My Papers</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </TopBar>

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
            ) : null}
          </View>
        )}
        data={loading || filtered.length === 0 ? [] : filtered}
        keyExtractor={(item) => item.id}
        estimatedItemSize={104}
        renderItem={({ item, index }) => (
          <ListEntranceItem key={item.id} index={index}>
            <MyPaperCard
              paper={item}
              category={resolveCategoryName(item.category, categoryNameById)}
              onPress={() => navigation.navigate('ResearchDetail', { paperId: item.id })}
            />
          </ListEntranceItem>
        )}
      />
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
      paddingTop: t.spacing.md,
      paddingBottom: t.spacing['3xl'] + 120,
      gap: t.spacing.md,
    },
    header: {
      gap: t.spacing.md,
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
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      borderRadius: t.radii.md,
      borderCurve: 'continuous',
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      backgroundColor: t.colors.surface.sunken,
    },
    searchInput: {
      flex: 1,
      ...t.typography.body,
      color: t.colors.text.primary,
      paddingVertical: 0,
    },
    filters: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.spacing.sm,
    },
    skeletonList: {
      gap: t.spacing.md,
    },
    list: {
      gap: t.spacing.md,
    },
  });
