import { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Chip,
  EmptyState,
  InlineNotice,
  PressableCard,
  Screen,
  Skeleton,
} from '../../components/ui';
import { facultyApi, type FacultyAssignedPaper } from '../../api/faculty';
import {
  FACULTY_QUEUE_FILTERS,
  facultyStatusLabel,
  facultyStatusTone,
  matchesQueueFilter,
  type FacultyQueueFilter,
} from './facultyStatus';
import { RootStackParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

type FacultyNavigation = NativeStackNavigationProp<RootStackParamList>;

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const FacultyReviewScreen = () => {
  const navigation = useNavigation<FacultyNavigation>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [papers, setPapers] = useState<FacultyAssignedPaper[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FacultyQueueFilter>('needs_review');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      setPapers(await facultyApi.getAssignedPapers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load assigned papers.');
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

  const counts = useMemo(() => {
    const list = papers ?? [];
    return FACULTY_QUEUE_FILTERS.reduce(
      (acc, entry) => {
        acc[entry.key] = list.filter((paper) => matchesQueueFilter(paper.status, entry.key)).length;
        return acc;
      },
      {} as Record<FacultyQueueFilter, number>
    );
  }, [papers]);

  const visible = useMemo(() => {
    const list = papers ?? [];
    const query = search.trim().toLowerCase();
    return list.filter((paper) => {
      if (!matchesQueueFilter(paper.status, filter)) return false;
      if (!query) return true;
      const corpus = `${paper.title} ${paper.authorName} ${(paper.keywords ?? []).join(' ')}`.toLowerCase();
      return corpus.includes(query);
    });
  }, [papers, filter, search]);

  return (
    <Screen gutter={0} edges={{ bottom: false }}>
      <View style={styles.header}>
        <Text style={styles.title}>Review</Text>
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
          {FACULTY_QUEUE_FILTERS.map((entry) => (
            <Chip
              key={entry.key}
              label={`${entry.label} (${counts[entry.key] ?? 0})`}
              variant="filter"
              active={filter === entry.key}
              onPress={() => setFilter(entry.key)}
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
            title="No papers"
            message={search.trim() ? 'No papers match your search.' : 'Nothing in this view yet.'}
          />
        ) : (
          <View style={styles.list}>
            {visible.map((paper) => (
              <PressableCard
                key={paper.id}
                accessibilityLabel={`Review ${paper.title}`}
                onPress={() => navigation.navigate('FacultyReviewDetail', { paperId: paper.id })}
              >
                <View style={styles.badgeRow}>
                  <Chip
                    label={facultyStatusLabel(paper.status)}
                    variant="status"
                    tone={facultyStatusTone(paper.status)}
                  />
                </View>
                <Text style={styles.paperTitle} numberOfLines={2}>
                  {paper.title}
                </Text>
                <Text style={styles.paperMeta} numberOfLines={1}>
                  {paper.authorName} · {formatDate(paper.submissionDate || paper.createdAt)}
                </Text>
              </PressableCard>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing['3xl'],
    flexGrow: 1,
  },
  title: {
    fontFamily: theme.fontFamilies.display.semibold,
    fontSize: 26,
    lineHeight: 32,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  list: {
    gap: theme.spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  paperTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.xs,
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
