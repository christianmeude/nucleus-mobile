import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Chip, EmptyState, InlineNotice, PressableCard, Skeleton } from '../../components/ui';
import { facultyApi, type FacultyAssignedPaper } from '../../api/faculty';
import { researchApi } from '../../api/research';
import { Category } from '../../types/domain';
import { RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

type FacultyNavigation = NativeStackNavigationProp<RootStackParamList>;

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const FacultyRepositoryScreen = () => {
  const navigation = useNavigation<FacultyNavigation>();
  const [papers, setPapers] = useState<FacultyAssignedPaper[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const [publishedRows, categoryRows] = await Promise.all([
        facultyApi.getPublishedPapers(),
        researchApi.getCategories(),
      ]);
      setPapers(publishedRows);
      setCategories(categoryRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load published papers.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const categoryNameById = useMemo(
    () => new Map(categories.map((item) => [item.id, item.name])),
    [categories]
  );

  const visible = useMemo(() => {
    const list = papers ?? [];
    const query = search.trim().toLowerCase();
    return list
      .filter((paper) => (categoryFilter ? paper.category === categoryFilter : true))
      .filter((paper) => {
        if (!query) return true;
        const corpus = `${paper.title} ${paper.authorName} ${(paper.keywords ?? []).join(' ')}`.toLowerCase();
        return corpus.includes(query);
      })
      .sort((left, right) => {
        const leftTime = new Date(left.submissionDate || left.createdAt || 0).getTime();
        const rightTime = new Date(right.submissionDate || right.createdAt || 0).getTime();
        return rightTime - leftTime;
      });
  }, [papers, categoryFilter, search]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by title, author, or keyword"
          placeholderTextColor={theme.colors.text.muted}
          style={styles.search}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <Chip
            label="All categories"
            variant="filter"
            active={categoryFilter === ''}
            onPress={() => setCategoryFilter('')}
          />
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              variant="filter"
              active={categoryFilter === category.id}
              onPress={() => setCategoryFilter(category.id)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        }
      >
        {error ? <InlineNotice tone="danger" message={error} /> : null}

        {papers === null ? (
          error ? (
            <Text style={styles.hint}>Pull down to retry.</Text>
          ) : (
            <View style={styles.list}>
              {[0, 1, 2, 3].map((key) => (
                <Skeleton key={key} height={84} radius="lg" />
              ))}
            </View>
          )
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="library-outline" size={24} color={theme.colors.text.muted} />}
            title="No papers found"
            message={search.trim() ? `No results for "${search.trim()}"` : 'No published papers in this category yet.'}
          />
        ) : (
          <View style={styles.list}>
            {visible.map((paper) => (
              <PressableCard
                key={paper.id}
                accessibilityLabel={`Open ${paper.title}`}
                onPress={() => navigation.navigate('FacultyPaperDetail', { paperId: paper.id })}
              >
                <Text style={styles.paperTitle} numberOfLines={2}>
                  {paper.title}
                </Text>
                <Text style={styles.paperMeta} numberOfLines={1}>
                  {paper.authorName}
                  {paper.department ? ` · ${paper.department}` : ''} ·{' '}
                  {formatDate(paper.submissionDate || paper.createdAt)}
                </Text>
                {paper.category && categoryNameById.has(paper.category) ? (
                  <Text style={styles.paperMeta} numberOfLines={1}>
                    {categoryNameById.get(paper.category)}
                  </Text>
                ) : null}
              </PressableCard>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.surface.base,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.subtle,
  },
  search: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.surface.raised,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    height: 44,
  },
  filters: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingRight: theme.spacing.lg,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    flexGrow: 1,
  },
  list: {
    gap: theme.spacing.md,
  },
  paperTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text.primary,
  },
  paperMeta: {
    ...theme.typography.metadata,
    color: theme.colors.text.muted,
    marginTop: theme.spacing.xs,
  },
  hint: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.muted,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
});
