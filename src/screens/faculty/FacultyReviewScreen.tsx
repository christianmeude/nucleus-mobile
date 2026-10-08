import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { LegendList } from '@legendapp/list/react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import * as Haptics from 'expo-haptics';
import {
  EmptyState,
  FilterSelect,
  InlineNotice,
  Screen,
  SearchField,
  Skeleton,
  TopBar,
} from '../../components/ui';
import { FacultyPaperCard } from '../../components/FacultyPaperCard';
import { ListEntranceItem } from '../../components/ListEntranceItem';
import { facultyApi, type FacultyAssignedPaper } from '../../api/faculty';
import { FACULTY_QUEUE_FILTERS, type FacultyQueueFilter } from './facultyStatus';
import { FacultyTabsParamList, FacultyTabNavigationProp } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { motion, type Theme } from '../../theme';
import { listEpochKey } from '../../utils/listEpochKey';

export const FacultyReviewScreen = () => {
  const navigation = useNavigation<FacultyTabNavigationProp>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [papers, setPapers] = useState<FacultyAssignedPaper[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const route = useRoute<RouteProp<FacultyTabsParamList, 'FacultyReview'>>();
  const [filter, setFilter] = useState<FacultyQueueFilter>(
    (route.params?.initialFilter as FacultyQueueFilter) ?? 'needs_review',
  );
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterPending, setFilterPending] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Mirror of `papers` for the first-load check inside `load` — kept in a
  // ref so `load` doesn't depend on `papers` (which re-created it on every
  // setPapers and re-fired the load effect: one tap, two fetches).
  const papersRef = useRef<FacultyAssignedPaper[] | null>(null);
  const requestRef = useRef(0);

  // Sync the mirror after render, before the load effect below reads it.
  useEffect(() => {
    papersRef.current = papers;
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async (pageNum = 0, currentFilter = filter, currentSearch = debouncedSearch) => {
      try {
        if (pageNum === 0) {
          setError(null);
          if (!refreshing && !papersRef.current) setPapers(null); // Show skeleton only if no existing papers
        } else {
          setLoadingMore(true);
        }

        const limit = 20;
        const data = await facultyApi.getReviewQueue(pageNum, limit, currentFilter, currentSearch, {
          forceRefresh: refreshing,
        });

        if (pageNum === 0) {
          setPapers(data);
        } else {
          setPapers((prev) => (prev ? [...prev, ...data] : data));
        }

        setHasMore(data.length === limit);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load assigned papers.');
      } finally {
        setLoadingMore(false);
      }
    },
    [refreshing, filter, debouncedSearch],
  );

  // Load when filter or debounced search changes. The pending flag gives
  // instant tap feedback while the round-trip lands; the generation guard
  // keeps a stale response from clearing a newer request's flag.
  useEffect(() => {
    const id = ++requestRef.current;
    setFilterPending(true);
    load(0, filter, debouncedSearch).finally(() => {
      if (requestRef.current === id) setFilterPending(false);
    });
  }, [filter, debouncedSearch, load]);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await load(0, filter, debouncedSearch);
    setRefreshing(false);
  }, [load, filter, debouncedSearch]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || !papers) return;
    load(page + 1, filter, debouncedSearch);
  }, [hasMore, loadingMore, papers, load, page, filter, debouncedSearch]);

  const handlePaperPress = useCallback(
    (paperId: string) => {
      navigation.navigate('FacultyReviewDetail', { paperId });
    },
    [navigation],
  );

  // Atomic first paint: the list fades in as one motion once laid out,
  // instead of rows cascading in one-by-one over the stagger delays.
  const [firstPaintDone, setFirstPaintDone] = useState(false);
  const paintOpacity = useRef(new Animated.Value(0)).current;
  const handleListLayout = useCallback(() => {
    if (firstPaintDone) return;
    setFirstPaintDone(true);
    Animated.timing(paintOpacity, {
      toValue: 1,
      duration: motion.duration.base,
      useNativeDriver: true,
    }).start();
  }, [firstPaintDone, paintOpacity]);

  const renderPaperItem = useCallback(
    ({ item: rawItem, index }: { item: any; index: number }) => {
      const item = rawItem as FacultyAssignedPaper;
      return (
        <ListEntranceItem index={index}>
          <FacultyPaperCard paper={item} index={index} onPress={() => handlePaperPress(item.id)} />
        </ListEntranceItem>
      );
    },
    [handlePaperPress],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  const renderFooter = useCallback(
    () =>
      loadingMore ? (
        <View style={{ padding: 16 }}>
          <Skeleton height={84} radius="lg" />
        </View>
      ) : null,
    [loadingMore],
  );

  return (
    <Screen gutter={0} edges={{ bottom: false }}>
      <View style={styles.header}>
        <TopBar variant="compact">
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Review Queue</Text>
          </View>
        </TopBar>

        <View style={styles.searchRow}>
          <View style={styles.searchFlex}>
            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder="Search submissions"
              accessibilityLabel="Search submissions"
              accessibilityHint="Filters review queue by title, author, or keyword"
            />
          </View>

          <FilterSelect
            label="Status"
            options={FACULTY_QUEUE_FILTERS}
            value={filter}
            defaultValue="all"
            onValueChange={setFilter}
          />
        </View>
      </View>

      <Animated.View style={[styles.listPaint, { opacity: paintOpacity }]} onLayout={handleListLayout}>
      <LegendList
        key={listEpochKey((papers ?? []).length === 0)}
        recycleItems={true}
        drawDistance={1500}
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
            {papers !== null ? (
              <View style={styles.subbar}>
                <Text style={styles.resultCount}>
                  {papers.length} {papers.length === 1 ? 'Submission' : 'Submissions'}
                </Text>
                {filterPending && (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.brand.primary}
                    accessibilityLabel="Updating review queue"
                  />
                )}
              </View>
            ) : null}

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
            ) : papers.length === 0 ? (
              <EmptyState
                context={search.trim() ? 'no-results' : 'no-papers'}
                message={search.trim() ? undefined : 'Nothing in this view yet.'}
              />
            ) : null}
          </View>
        )}
        data={papers ?? []}
        keyExtractor={keyExtractor}
        estimatedItemSize={85}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        renderItem={renderPaperItem}
      />
      </Animated.View>
    </Screen>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    listPaint: {
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
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    searchFlex: {
      flex: 1,
      minWidth: 0,
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
    subbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    resultCount: {
      fontFamily: theme.fontFamilies.ui.semibold,
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.colors.text.muted,
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
