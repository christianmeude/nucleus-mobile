import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Keyboard, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ListRenderItem } from 'react-native';
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui/Icon';

import { useNavigation, useRoute } from '@react-navigation/native';
import { LegendList } from '@legendapp/list/react-native';
import { ListEntranceItem } from '../../components/ListEntranceItem';

import { researchApi, submitApi, type DepartmentRow, type ProgramRow } from '../../api/research';
import { useAuth } from '../../context/AuthContext';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useRecentSearches } from '../../hooks/useRecentSearches';
import { flags } from '../../config/flags';
import { Category, ResearchPaper } from '../../types/domain';
import { paperDate, getPrimaryAuthorName } from '../../utils/format';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { haptics } from '../../lib/haptics';
import {
  BottomSheet,
  BottomSheetScrollView,
  BottomSheetTextInput,
  EmptyState,
  InlineNotice,
  PressableScale,
  Screen,
  Skeleton,
  TopBar,
} from '../../components/ui';
import { buildCategoryNameById, resolveCategoryName } from '../../utils/category';

import { BrowseHeader } from './browse/BrowseHeader';
import { BrowseFilterBar } from './browse/BrowseFilterBar';
import { StandardPaperCard } from '../../components/StandardPaperCard';
import { BrowseGridCell } from './browse/BrowseGridCell';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CloudOff, Landmark, Check } from 'lucide-react-native';


type ViewMode = 'list' | 'grid';

const timeOf = (paper: ResearchPaper) => new Date(paperDate(paper) || 0).getTime();

export const BrowseScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [programSel, setProgramSel] = useState<{ id: string; name: string } | null>(null);
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [tempYearFrom, setTempYearFrom] = useState('');
  const [tempYearTo, setTempYearTo] = useState('');
  const [yearError, setYearError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const yearSheetRef = useRef<BottomSheetModal>(null);
  const fieldSheetRef = useRef<BottomSheetModal>(null);
  const deptSheetRef = useRef<BottomSheetModal>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [serverResults, setServerResults] = useState<ResearchPaper[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const { recent, addRecent } = useRecentSearches();

  const loadData = useCallback(async (silent = false) => {
    if (!silent && papers.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [publishedRows, categoryRows, departmentRows, programRows] = await Promise.all([
        researchApi.getPublishedPapers(undefined, { forceRefresh: silent }),
        researchApi.getCategories({ forceRefresh: silent }),
        submitApi.getDepartments(),
        submitApi.getPrograms(),
      ]);

      setPapers(publishedRows);
      setCategories(categoryRows);
      setDepartments(departmentRows);
      setPrograms(programRows);
      setError('');
    } catch (_error) {
      setError('Unable to load published papers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [papers.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const paramCategoryId: string | undefined = route.params?.categoryId;
  useEffect(() => {
    if (!paramCategoryId) return;
    setCategoryFilter(paramCategoryId);
    navigation.setParams({ categoryId: undefined });
  }, [paramCategoryId, navigation]);

  const runSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      addRecent(trimmed);
      setQuery(trimmed);
      Keyboard.dismiss();
    },
    [addRecent],
  );

  const submitSearch = useCallback(() => runSearch(query), [query, runSearch]);

  const debouncedQuery = useDebouncedValue(query.trim(), 350);
  const isTyping = query.trim() !== debouncedQuery;
  const useServerSearch = flags.hybridSearch && query.trim().length > 0;

  useEffect(() => {
    if (!flags.hybridSearch || debouncedQuery.length === 0) {
      setServerResults(null);
      setSearchError('');
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    researchApi
      .searchPapers(debouncedQuery, { yearFrom, yearTo })
      .then((rows) => {
        if (cancelled) return;
        setServerResults(rows);
        setSearchError('');
      })
      .catch(() => {
        if (cancelled) return;
        setServerResults([]);
        setSearchError('Search is unavailable right now. Try again in a moment.');
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useServerSearch, debouncedQuery, yearFrom, yearTo]);

  const clearSearch = useCallback(() => {
    setQuery('');
    Keyboard.dismiss();
  }, []);

  const categoryNameById = useMemo(() => buildCategoryNameById(categories), [categories]);

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

  const isFiltering = Boolean(query.trim() || categoryFilter || deptFilter || programSel);

  const matched = useMemo(() => {
    let rows = useServerSearch ? (serverResults ?? []) : papers;

    const yFrom = yearFrom ? parseInt(yearFrom, 10) : null;
    const yTo = yearTo ? parseInt(yearTo, 10) : null;

    const normalizedDept = deptFilter.trim().toLowerCase();

    return rows.filter((paper) => {
      if (categoryFilter && paper.category !== categoryFilter) {
        return false;
      }

      if (normalizedDept && (paper.department || '').trim().toLowerCase() !== normalizedDept) {
        return false;
      }

      if (programSel && paper.program_id !== programSel.id) {
        return false;
      }

      if (yFrom !== null || yTo !== null) {
        const dateValue = paperDate(paper);
        const paperYear = dateValue ? new Date(dateValue).getFullYear() : null;

        if (!paperYear) return false;
        if (yFrom !== null && paperYear < yFrom) return false;
        if (yTo !== null && paperYear > yTo) return false;
      }

      if (!flags.hybridSearch) {
        const normalized = query.trim().toLowerCase();
        if (normalized) {
          const keywords = Array.isArray(paper.keywords) ? paper.keywords.join(' ') : '';
          const authorName = getPrimaryAuthorName(paper);
          const target = `${paper.title} ${paper.abstract} ${keywords} ${authorName}`.toLowerCase();
          if (!target.includes(normalized)) return false;
        }
      }

      return true;
    });
  }, [useServerSearch, serverResults, categoryFilter, deptFilter, programSel, papers, query, yearFrom, yearTo]);

  const sorted = useMemo(() => {
    if (useServerSearch) return matched;
    const arr = [...matched];
    arr.sort((left, right) => timeOf(right) - timeOf(left));
    return arr;
  }, [useServerSearch, matched]);

  const gridItems = sorted;

  const listData = loading || (useServerSearch && searchLoading) ? [] : gridItems;

  const openDetail = useCallback(
    (paperId: string) =>
      navigation.navigate(user?.role === 'faculty' ? 'FacultyPaperDetail' : 'ResearchDetail', {
        paperId,
      }),
    [navigation, user?.role],
  );

  const keyExtractor = useCallback((item: ResearchPaper) => item.id, []);

  const handleRefresh = useCallback(() => {
    haptics.light();
    loadData(true);
  }, [loadData]);

  const renderItem = useCallback(
    ({ item, index }: { item: ResearchPaper; index: number }) => {
      const categoryColor = colorForCategory(item.category);
      const categoryName = resolveCategoryName(item.category, categoryNameById);
      return (
        <ListEntranceItem index={index}>
          {viewMode === 'grid' ? (
            <BrowseGridCell
              paper={item}
              category={categoryName}
              categoryColor={categoryColor}
              onOpen={openDetail}
            />
          ) : (
            <StandardPaperCard
              paper={item}
              variant="browse"
              category={categoryName}
              categoryColor={categoryColor}
              onPress={() => openDetail(item.id)}
            />
          )}
        </ListEntranceItem>
      );
    },
    [viewMode, colorForCategory, categoryNameById, openDetail, reducedMotion],
  );

  let yearLabel = 'All Years';
  if (yearFrom && yearTo) yearLabel = `${yearFrom} - ${yearTo}`;
  else if (yearFrom) yearLabel = `From ${yearFrom}`;
  else if (yearTo) yearLabel = `Up to ${yearTo}`;

  const fieldLabel = categoryFilter
    ? (resolveCategoryName(categoryFilter, categoryNameById) ?? 'Field')
    : 'All fields';
  const deptLabel = programSel
    ? programSel.name
    : deptFilter || 'All departments';
  const showClear = Boolean(query.trim());

  const hasActiveFilters = !!(categoryFilter || deptFilter || programSel || yearFrom || yearTo);

  const handleClearFilters = useCallback(() => {
    setCategoryFilter('');
    setDeptFilter('');
    setProgramSel(null);
    setYearFrom('');
    setYearTo('');
  }, []);

  const listHeaderElement = (
    <>
      <View style={styles.listHeader}>
        <BrowseFilterBar
          resultCount={sorted.length}
          fieldLabel={fieldLabel}
          deptLabel={deptLabel}
          yearLabel={yearLabel}
          viewMode={viewMode}
          onOpenFieldSheet={() => fieldSheetRef.current?.present()}
          onOpenDeptSheet={() => deptSheetRef.current?.present()}
          onOpenYearSheet={() => {
            setTempYearFrom(yearFrom);
            setTempYearTo(yearTo);
            setYearError('');
            yearSheetRef.current?.present();
          }}
          onChangeViewMode={setViewMode}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {error ? <InlineNotice tone="danger" message={error} /> : null}
      </View>
    </>
  );

  const listEmptyElement =
    loading || (useServerSearch && (searchLoading || isTyping)) ? (
      <View style={styles.loadingWrap}>
        <Skeleton height={140} />
        <Skeleton height={84} />
        <Skeleton height={84} />
        <Skeleton height={84} />
      </View>
    ) : searchError ? (
      <EmptyState
        icon={<Icon icon={CloudOff} size={24} color={theme.colors.text.muted} />}
        title="Search unavailable"
        message={searchError}
      />
    ) : sorted.length === 0 ? (
      <EmptyState
        icon={<Icon icon={Landmark} size={24} color={theme.colors.text.muted} />}
        title="No papers found"
        message={
          query.trim() ? `No results for "${query.trim()}"` : 'No papers found in this category'
        }
      />
    ) : null;

  return (
    <>
      <Screen gutter={0} edges={{ top: false, bottom: false }}>
        <View
          style={[
            styles.root,
            { paddingTop: insets.top + theme.spacing.md, paddingBottom: insets.bottom },
          ]}
        >
          <TopBar />

          <BrowseHeader
            query={query}
            setQuery={setQuery}
            submitSearch={submitSearch}
            clearSearch={clearSearch}
            showClear={showClear}
          />

          <View style={styles.resultsWrap}>
            <LegendList
              recycleItems={true}
              drawDistance={1500}
              style={styles.scroll}
              contentContainerStyle={styles.resultsContent}
              data={listData}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              numColumns={viewMode === 'grid' ? 2 : 1}
              ListHeaderComponent={listHeaderElement}
              ListEmptyComponent={listEmptyElement}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={theme.colors.brand.primary}
                  colors={[theme.colors.brand.primary]}
                />
              }
              estimatedItemSize={viewMode === 'grid' ? 160 : 84}
            />
          </View>
        </View>
      </Screen>

      <BottomSheet ref={yearSheetRef} onDismiss={() => {
        setYearError('');
      }}>
        <Text style={styles.sheetTitle}>Filter by Year</Text>
        {!!yearError && (
          <Text style={{ color: theme.colors.state.danger, marginBottom: 12, ...theme.typography.caption }}>
            {yearError}
          </Text>
        )}
        <View style={styles.yearInputsRow}>
          <Input
            component={BottomSheetTextInput}
            containerStyle={styles.yearInput}
            placeholder="From (e.g. 2020)"
            keyboardType="number-pad"
            maxLength={4}
            value={tempYearFrom}
            onChangeText={setTempYearFrom}
          />
          <Input
            component={BottomSheetTextInput}
            containerStyle={styles.yearInput}
            placeholder="To (e.g. 2022)"
            keyboardType="number-pad"
            maxLength={4}
            value={tempYearTo}
            onChangeText={setTempYearTo}
          />
        </View>
        <View style={{ marginTop: 16 }}>
          <Button
            label="Apply Filter"
            onPress={() => {
              const fStr = tempYearFrom.trim();
              const tStr = tempYearTo.trim();
              const f = parseInt(fStr, 10);
              const t = parseInt(tStr, 10);
              
              if (fStr && tStr && !isNaN(f) && !isNaN(t) && f > t) {
                setYearError('"From" year cannot be greater than "To" year.');
                return;
              }
              
              setYearError('');
              setYearFrom(fStr);
              setYearTo(tStr);
              yearSheetRef.current?.dismiss();
            }}
          />
        </View>
        {(yearFrom || yearTo) && (
          <View style={{ marginTop: 8 }}>
            <Button
              label="Clear Year Filter"
              variant="subtle"
              onPress={() => {
                setYearError('');
                setYearFrom('');
                setYearTo('');
                setTempYearFrom('');
                setTempYearTo('');
                yearSheetRef.current?.dismiss();
              }}
            />
          </View>
        )}
      </BottomSheet>

      <BottomSheet ref={fieldSheetRef} snapPoints={['50%', '90%']}>
        <Text style={styles.sheetTitle}>Field</Text>
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          style={styles.sheetScroll}
        >
          <PressableScale
            style={styles.sheetRow}
            onPress={() => {
              setCategoryFilter('');
              fieldSheetRef.current?.dismiss();
            }}
          >
            <Text style={[styles.sheetRowText, !categoryFilter ? styles.sheetRowActive : null]}>
              All fields
            </Text>
            {!categoryFilter ? (
              <Icon icon={Check} size={18} color={theme.colors.brand.primary} />
            ) : null}
          </PressableScale>
          {categories.map((category) => {
            const active = categoryFilter === category.id;
            return (
              <PressableScale
                key={category.id}
                style={styles.sheetRow}
                onPress={() => {
                  setCategoryFilter(category.id);
                  fieldSheetRef.current?.dismiss();
                }}
              >
                <Text
                  style={[styles.sheetRowText, active ? styles.sheetRowActive : null]}
                  numberOfLines={1}
                >
                  {category.name}
                </Text>
                {active ? <Icon icon={Check} size={18} color={theme.colors.brand.primary} /> : null}
              </PressableScale>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheet>

      <BottomSheet ref={deptSheetRef} snapPoints={['50%', '90%']}>
        <Text style={styles.sheetTitle}>Department</Text>
        <Text style={styles.sheetIntro}>
          Narrow results to a department or a specific program within it.
        </Text>
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          style={styles.sheetScroll}
        >
          <PressableScale
            style={styles.sheetRow}
            onPress={() => {
              setDeptFilter('');
              setProgramSel(null);
              deptSheetRef.current?.dismiss();
            }}
          >
            <Text
              style={[
                styles.sheetRowText,
                !deptFilter && !programSel ? styles.sheetRowActive : null,
              ]}
            >
              All departments
            </Text>
            {!deptFilter && !programSel ? (
              <Icon icon={Check} size={18} color={theme.colors.brand.primary} />
            ) : null}
          </PressableScale>
          {departments.map((dept) => {
            const deptPrograms = programs.filter((p) => p.department_id === dept.id);
            const deptActive = deptFilter === dept.name && !programSel;
            return (
              <View key={dept.id}>
                <PressableScale
                  style={styles.sheetRow}
                  onPress={() => {
                    setDeptFilter(dept.name);
                    setProgramSel(null);
                    deptSheetRef.current?.dismiss();
                  }}
                >
                  <Text
                    style={[
                      styles.sheetRowText,
                      styles.sheetDeptText,
                      deptActive ? styles.sheetRowActive : null,
                    ]}
                    numberOfLines={1}
                  >
                    {dept.name}
                  </Text>
                  {deptActive ? (
                    <Icon icon={Check} size={18} color={theme.colors.brand.primary} />
                  ) : null}
                </PressableScale>
                {deptPrograms.map((program) => {
                  const progActive = programSel?.id === program.id;
                  return (
                    <PressableScale
                      key={program.id}
                      style={[styles.sheetRow, styles.sheetProgramRow]}
                      onPress={() => {
                        setDeptFilter(dept.name);
                        setProgramSel({ id: program.id, name: program.name });
                        deptSheetRef.current?.dismiss();
                      }}
                    >
                      <Text
                        style={[styles.sheetRowText, progActive ? styles.sheetRowActive : null]}
                        numberOfLines={1}
                      >
                        {program.code ? `${program.code} — ` : ''}
                        {program.name}
                      </Text>
                      {progActive ? (
                        <Icon icon={Check} size={18} color={theme.colors.brand.primary} />
                      ) : null}
                    </PressableScale>
                  );
                })}
              </View>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheet>
    </>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    spacer: {
      flexShrink: 1,
      flexBasis: 0,
    },
    resultsWrap: {
      flex: 1,
      overflow: 'hidden',
    },
    scroll: {
      flex: 1,
    },
    resultsContent: {
      gap: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl + 120,
    },
    listHeader: {
      gap: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    },
    loadingWrap: {
      gap: theme.spacing.md,
    },
    sheetTitle: {
      ...theme.typography.h3,
      color: theme.colors.text.primary,
    },
    sheetIntro: {
      ...theme.typography.bodySmall,
      color: theme.colors.text.secondary,
      marginTop: -theme.spacing.xs,
    },
    sheetDeptText: {
      fontFamily: theme.fontFamilies.ui.semibold,
    },
    sheetProgramRow: {
      paddingLeft: theme.spacing.lg,
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
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    sheetRowActive: {
      color: theme.colors.brand.primary,
      fontFamily: theme.fontFamilies.ui.semibold,
    },
    sheetScroll: {
      flex: 1,
    },
    yearInputsRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    yearInput: {
      flex: 1,
    },
  });
