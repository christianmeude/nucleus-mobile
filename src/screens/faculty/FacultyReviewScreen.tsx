import { Icon } from '../../components/ui/Icon';
import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LegendList } from '@legendapp/list/react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { LinearGradient } from 'expo-linear-gradient';
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
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react-native';


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

  const pillScrollRef = useRef<ScrollView>(null);
  const [showRightHint, setShowRightHint] = useState(true);
  const [showLeftHint, setShowLeftHint] = useState(false);

  const handlePillScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const canScrollRight = contentOffset.x < contentSize.width - layoutMeasurement.width - 15;
    const canScrollLeft = contentOffset.x > 15;
    if (canScrollRight !== showRightHint) setShowRightHint(canScrollRight);
    if (canScrollLeft !== showLeftHint) setShowLeftHint(canScrollLeft);
  }, [showRightHint, showLeftHint]);

  const subtitle = useMemo(() => {
    if (!papers) return 'Loading queue...';
    const total = papers.length;
    if (total === 0) return 'No submissions in this view';
    const activeLabel = FACULTY_QUEUE_FILTERS.find((f) => f.key === filter)?.label || 'All';
    return `${total} ${activeLabel.toLowerCase()} submission${total === 1 ? '' : 's'}`;
  }, [papers, filter]);

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
        if (!refreshing && pageNum === 0 && !papers) setPapers(null); // Show skeleton only if no existing papers
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
  }, [refreshing, filter, debouncedSearch, papers]);

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
      <View style={styles.header}>
        <TopBar variant="compact">
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Review Queue</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </TopBar>

        <View style={styles.searchContainer}>
          <Icon icon={Search} size={20} color={theme.colors.text.muted} style={styles.searchIcon} />
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
              <Icon icon={X} size={16} color={theme.colors.text.muted} />
            </Pressable>
          )}
        </View>

        <View style={styles.pillContainerOuter}>
          <ScrollView
            ref={pillScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={handlePillScroll}
            scrollEventThrottle={16}
            onContentSizeChange={(w) => {
              setShowRightHint(w > 360);
            }}
            style={styles.pillScrollWrapper}
            contentContainerStyle={styles.pillContainer}
          >
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
          </ScrollView>

          {showLeftHint && (
            <View style={styles.scrollHintLeftWrap} pointerEvents="box-none">
              <LinearGradient
                colors={[theme.colors.surface.sunken, 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.scrollHintGradient}
                pointerEvents="none"
              />
              <Pressable
                style={styles.scrollHintButton}
                onPress={() => {
                  Haptics.selectionAsync();
                  pillScrollRef.current?.scrollTo({ x: 0, animated: true });
                }}
                accessibilityLabel="Scroll left to see earlier filters"
              >
                <Icon icon={ChevronLeft} size={16} color={theme.colors.brand.primary} />
              </Pressable>
            </View>
          )}

          {showRightHint && (
            <View style={styles.scrollHintRightWrap} pointerEvents="box-none">
              <LinearGradient
                colors={['transparent', theme.colors.surface.sunken]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.scrollHintGradient}
                pointerEvents="none"
              />
              <Pressable
                style={styles.scrollHintButton}
                onPress={() => {
                  Haptics.selectionAsync();
                  pillScrollRef.current?.scrollToEnd({ animated: true });
                }}
                accessibilityLabel="Scroll right to see more filters"
              >
                <Icon icon={ChevronRight} size={16} color={theme.colors.brand.primary} />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <LegendList
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
    subtitle: {
      fontFamily: theme.fontFamilies.ui.regular,
      fontSize: 13,
      color: theme.colors.text.muted,
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
    pillScrollWrapper: {
      flexGrow: 0,
    },
    pillContainerOuter: {
      position: 'relative',
    },
    pillContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface.sunken,
      borderRadius: 9999,
      padding: 4,
      gap: 4,
    },
    scrollHintLeftWrap: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingLeft: 4,
    },
    scrollHintRightWrap: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingRight: 4,
    },
    scrollHintGradient: {
      ...StyleSheet.absoluteFill,
      borderRadius: 9999,
    },
    scrollHintButton: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.surface.raised,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.level1,
    },
    pillSegment: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
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
