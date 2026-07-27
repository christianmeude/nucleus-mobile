import { useCallback, useMemo, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { LegendList } from '@legendapp/list/react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { EmptyState, InlineNotice, Screen, Skeleton, TopBar } from '../../components/ui';
import { FacultyPaperCard } from '../../components/FacultyPaperCard';
import { ListEntranceItem } from '../../components/ListEntranceItem';
import { facultyApi, type FacultyAssignedPaper } from '../../api/faculty';
import {
  FACULTY_QUEUE_FILTERS,
  type FacultyQueueFilter,
} from './facultyStatus';
import { FacultyTabsParamList, FacultyTabNavigationProp } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

export const FacultyReviewScreen = () => {
  const navigation = useNavigation<FacultyTabNavigationProp>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  
  const [papers, setPapers] = useState<FacultyAssignedPaper[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const route = useRoute<RouteProp<FacultyTabsParamList, 'FacultyReview'>>();
  const [filter, setFilter] = useState<FacultyQueueFilter>(
    (route.params?.initialFilter as FacultyQueueFilter) ?? 'needs_review'
  );
  const [search, setSearch] = useState('');

  const scrollOffset = useSharedValue(0);
  const onScroll = useCallback(
    (event: any) => {
      scrollOffset.value = event.nativeEvent.contentOffset.y;
    },
    [scrollOffset],
  );

  useEffect(() => {
    if (route.params?.initialFilter) {
      setFilter(route.params.initialFilter as FacultyQueueFilter);
    }
  }, [route.params?.initialFilter]);

  const headerAnimatedStyle = {};

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (pageNum = 0, currentFilter = filter, currentSearch = debouncedSearch) => {
    try {
      if (pageNum === 0) {
        setError(null);
        if (!refreshing && pageNum === 0) setPapers(null); // Show skeleton on fresh load
      } else {
        setLoadingMore(true);
      }

      const limit = 20;
      const data = await facultyApi.getReviewQueue(pageNum, limit, currentFilter, currentSearch);
      
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
  }, [refreshing, filter, debouncedSearch]);

  // Load when filter or debounced search changes
  useEffect(() => {
    load(0, filter, debouncedSearch);
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

  const handlePaperPress = useCallback((paperId: string) => {
    navigation.navigate('FacultyReviewDetail', { paperId });
  }, [navigation]);

  const renderPaperItem = useCallback(({ item: rawItem, index }: { item: any; index: number }) => {
    const item = rawItem as FacultyAssignedPaper;
    return (
      <ListEntranceItem index={index}>
        <FacultyPaperCard
          paper={item}
          index={index}
          onPress={() => handlePaperPress(item.id)}
        />
      </ListEntranceItem>
    );
  }, [handlePaperPress]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  const renderFooter = useCallback(() => (
    loadingMore ? <View style={{ padding: 16 }}><Skeleton height={84} radius="lg" /></View> : null
  ), [loadingMore]);

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
      </View>

      <LegendList
        recycleItems={true}
        onScroll={onScroll}
        scrollEventThrottle={16}
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
        estimatedItemSize={130}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        renderItem={renderPaperItem}
      />
    </Screen>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
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
