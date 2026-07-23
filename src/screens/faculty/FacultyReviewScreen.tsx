import { useCallback, useMemo, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { LegendList } from '@legendapp/list/react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { EmptyState, InlineNotice, Screen, Skeleton, TopBar } from '../../components/ui';
import { FacultyPaperCard } from '../../components/FacultyPaperCard';
import { facultyApi, type FacultyAssignedPaper } from '../../api/faculty';
import {
  FACULTY_QUEUE_FILTERS,
  matchesQueueFilter,
  type FacultyQueueFilter,
} from './facultyStatus';
import { RootStackParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

type FacultyNavigation = NativeStackNavigationProp<RootStackParamList>;

export const FacultyReviewScreen = () => {
  const navigation = useNavigation<FacultyNavigation>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [papers, setPapers] = useState<FacultyAssignedPaper[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FacultyQueueFilter>('needs_review');
  const [search, setSearch] = useState('');

  const scrollOffset = useSharedValue(0);
  const onScroll = useCallback(
    (event: any) => {
      scrollOffset.value = event.nativeEvent.contentOffset.y;
    },
    [scrollOffset],
  );

  const headerAnimatedStyle = {};

  const load = useCallback(async () => {
    try {
      setError(null);
      setPapers(await facultyApi.getAssignedPapers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load assigned papers.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      {} as Record<FacultyQueueFilter, number>,
    );
  }, [papers]);

  const visible = useMemo(() => {
    const list = papers ?? [];
    const query = search.trim().toLowerCase();
    return list.filter((paper) => {
      if (!matchesQueueFilter(paper.status, filter)) return false;
      if (!query) return true;
      const corpus =
        `${paper.title} ${paper.authorName} ${(paper.keywords ?? []).join(' ')}`.toLowerCase();
      return corpus.includes(query);
    });
  }, [papers, filter, search]);

  return (
    <Screen gutter={0} edges={{ bottom: false }}>
      <View style={[styles.header, headerAnimatedStyle]}>
        <TopBar title="Review" variant="large" scrollOffset={scrollOffset} />

        <View style={styles.searchContainer}>
          <Search size={20} color={theme.colors.text.muted} style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by title, author, or keyword"
            placeholderTextColor={theme.colors.text.muted}
            style={styles.search}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8} style={styles.clearButton}>
              <X size={16} color={theme.colors.text.muted} />
            </Pressable>
          )}
        </View>

        <View style={styles.pillContainer}>
          {FACULTY_QUEUE_FILTERS.map((entry) => {
            const isActive = filter === entry.key;
            return (
              <Pressable
                key={entry.key}
                style={[
                  styles.pillSegment,
                  isActive && { backgroundColor: theme.colors.brand.primary },
                ]}
                onPress={() => {
                  if (!isActive) {
                    Haptics.selectionAsync();
                    setFilter(entry.key);
                  }
                }}
              >
                <Text
                  style={[
                    styles.pillSegmentLabel,
                    isActive && { color: theme.colors.text.onBrand },
                  ]}
                >
                  {entry.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.papersCount}>
          {visible.length} {visible.length === 1 ? 'paper' : 'papers'}
        </Text>
      </View>

      <LegendList
        onScroll={onScroll}
        scrollEventThrottle={16}
        recycleItems={false}
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
        ListHeaderComponent={() => (
          <View style={styles.listHeader}>
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
                context={search.trim() ? 'no-results' : 'no-papers'}
                message={search.trim() ? undefined : 'Nothing in this view yet.'}
              />
            ) : null}
          </View>
        )}
        data={papers === null || visible.length === 0 ? ([] as FacultyAssignedPaper[]) : visible}
        keyExtractor={(item: any) => item.id}
        estimatedItemSize={84}
        renderItem={({ item: rawItem, index }) => {
          const item = rawItem as FacultyAssignedPaper;
          return (
            <FacultyPaperCard
              paper={item}
              index={index}
              onPress={() => navigation.navigate('FacultyReviewDetail', { paperId: item.id })}
            />
          );
        }}
      />
    </Screen>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface.raised,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border.subtle,
      zIndex: 10,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface.sunken,
      borderCurve: 'continuous',
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      height: 44,
    },
    searchIcon: {
      marginRight: theme.spacing.sm,
    },
    search: {
      ...theme.typography.body,
      flex: 1,
      color: theme.colors.text.primary,
      height: '100%',
    },
    clearButton: {
      marginLeft: theme.spacing.sm,
      padding: theme.spacing.xs,
    },
    pillContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface.sunken,
      borderRadius: 9999,
      padding: 4,
    },
    pillSegment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 9999,
    },
    pillSegmentLabel: {
      ...theme.typography.label,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    papersCount: {
      ...theme.typography.label,
      color: theme.colors.text.muted,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.md,
      paddingBottom: theme.spacing['3xl'] + 120,
      flexGrow: 1,
    },
    listHeader: {
      gap: theme.spacing.md,
    },
    list: {
      gap: theme.spacing.md,
    },
    hint: {
      ...theme.typography.bodySmall,
      color: theme.colors.text.muted,
      textAlign: 'center',
      paddingVertical: theme.spacing.xl,
    },
  });
