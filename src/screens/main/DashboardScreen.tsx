import { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { researchApi } from '../../api/research';
import { getSavedPapers, SavedPaper } from '../../api/collections';
import { Category, ResearchPaper } from '../../types/domain';
import { greetingForHour, initialsFor, paperDate } from '../../utils/format';
import { type Theme } from '../../theme';
import { ListEntranceItem } from '../../components/ListEntranceItem';
import {
  DashboardHero,
  EmptyState,
  InlineNotice,
  PressableScale,
  Screen,
  Skeleton,
} from '../../components/ui';
import {
  ACTION_STATUSES,
  ACTIVE_STATUSES,
  PUBLISHED_STATUSES,
} from '../../components/PaperStatusChip';

const RAIL_LIMIT = 6;

/**
 * Every discovery-rail card is the same size regardless of how long its title
 * runs — a fixed width + height so the row reads as one even shelf, not a
 * ragged strip (three-line title clamp keeps tall titles from breaking it).
 */
const RAIL_CARD_WIDTH = 208;
const RAIL_CARD_HEIGHT = 202;

/** Year label for a paper's most-relevant date, for the discovery rail meta. */
const paperYear = (paper: ResearchPaper): string => {
  const date = paperDate(paper);
  return date ? String(new Date(date).getFullYear()) : '';
};

/**
 * Pick the research category that best matches the student's program/department
 * so the discovery rail can lean toward their field. Papers are tagged by
 * `research_categories`, which is a separate taxonomy from the student's
 * program/department — there is no id join — so we match on name tokens
 * (program "BS Computer Science" → category "Computer Science"). Returns null
 * when nothing lines up, in which case the caller falls back to most-read.
 */
const pickDepartmentCategory = (
  categories: Category[],
  program?: string | null,
  department?: string | null
): Category | null => {
  const hay = `${program ?? ''} ${department ?? ''}`.toLowerCase().trim();
  if (!hay || categories.length === 0) return null;

  const contains =
    categories.find((c) => {
      const name = c.name.trim().toLowerCase();
      return name.length > 0 && (hay.includes(name) || name.includes(hay));
    }) ?? null;
  if (contains) return contains;

  // Looser fallback: any category word (longer than "the"/"and" noise) that
  // shows up in the program/department string.
  return (
    categories.find((c) =>
      c.name
        .toLowerCase()
        .split(/\s+/)
        .some((token) => token.length > 3 && hay.includes(token))
    ) ?? null
  );
};

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [published, setPublished] = useState<ResearchPaper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savedPapers, setSavedPapers] = useState<SavedPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const [papersResult, savedResult, publishedResult, categoriesResult] =
      await Promise.allSettled([
        researchApi.getMyPapers(),
        getSavedPapers(3),
        researchApi.getPublishedPapers(),
        researchApi.getCategories(),
      ]);

    if (papersResult.status === 'fulfilled') {
      setPapers(papersResult.value);
      setError('');
    } else {
      setError('Failed to load dashboard data.');
    }
    if (savedResult.status === 'fulfilled') setSavedPapers(savedResult.value);
    if (publishedResult.status === 'fulfilled') setPublished(publishedResult.value);
    if (categoriesResult.status === 'fulfilled') setCategories(categoriesResult.value);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const firstName = useMemo(() => {
    const fullName = user?.fullName?.trim();
    if (!fullName) return '';
    return fullName.split(/\s+/)[0] || '';
  }, [user?.fullName]);

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);
  const initials = useMemo(() => initialsFor(user?.fullName), [user?.fullName]);

  // Submissions-at-a-glance counts (routes to My Papers for the detail).
  const counts = useMemo(() => {
    return {
      total: papers.length,
      review: papers.filter((p) => ACTIVE_STATUSES.has(p.status)).length,
      revise: papers.filter((p) => ACTION_STATUSES.has(p.status)).length,
      published: papers.filter((p) => PUBLISHED_STATUSES.has(p.status)).length,
    };
  }, [papers]);

  // Discovery rail: papers in the student's field, most-read first. Falls back
  // to most-read overall when their department has too few (< 3) to fill a rail.
  const deptCategory = useMemo(
    () => pickDepartmentCategory(categories, user?.program, user?.department),
    [categories, user?.program, user?.department]
  );

  const recommended = useMemo(() => {
    const byViews = (a: ResearchPaper, b: ResearchPaper) =>
      (b.view_count || 0) - (a.view_count || 0);

    if (deptCategory) {
      const inField = published
        .filter((p) => p.category === deptCategory.id)
        .sort(byViews);
      if (inField.length >= 3) return inField.slice(0, RAIL_LIMIT);
    }
    return [...published].sort(byViews).slice(0, RAIL_LIMIT);
  }, [published, deptCategory]);

  const railTitle = useMemo(() => {
    const usingField =
      deptCategory &&
      recommended.length > 0 &&
      recommended.every((p) => p.category === deptCategory.id);
    return usingField ? `Recommended · ${deptCategory!.name}` : 'Most read';
  }, [deptCategory, recommended]);

  return (
    // Top edge opts out of Screen's inset padding: the hero bleeds under the
    // status bar (owns its own inset). Bottom edge opts out — the floating tab
    // bar owns it.
    <Screen gutter={0} edges={{ top: false, bottom: false }}>
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
        <DashboardHero
          greeting={greeting}
          name={firstName || 'Student'}
          initials={initials}
          onPressAvatar={() => navigation.navigate('Profile')}
        />

        <View style={styles.body}>
          {error ? <InlineNotice tone="danger" message={error} /> : null}

          {/* Your submissions — at a glance */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your submissions</Text>
              <PressableScale
                onPress={() => navigation.navigate('MyPapers')}
                accessibilityRole="button"
                accessibilityLabel="View all my papers"
                hitSlop={8}
              >
                <Text style={styles.sectionLink}>My Papers ›</Text>
              </PressableScale>
            </View>
            <PressableScale
              style={styles.statusStrip}
              onPress={() => navigation.navigate('MyPapers')}
              accessibilityRole="button"
              accessibilityLabel={`${counts.total} submissions: ${counts.review} in review, ${counts.revise} need revision, ${counts.published} published`}
            >
              <View style={styles.statTile}>
                <Text style={styles.statNum}>{counts.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statNum}>{counts.review}</Text>
                <Text style={styles.statLabel}>In review</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={[styles.statNum, styles.statNumWarn]}>{counts.revise}</Text>
                <Text style={styles.statLabel}>Revise</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={[styles.statNum, styles.statNumGood]}>{counts.published}</Text>
                <Text style={styles.statLabel}>Published</Text>
              </View>
            </PressableScale>
          </View>

          {/* Recommended by department (most-read fallback) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                {railTitle}
              </Text>
              <PressableScale
                onPress={() => navigation.navigate('Browse')}
                accessibilityRole="button"
                accessibilityLabel="Browse all papers"
                hitSlop={8}
              >
                <Text style={styles.sectionLink}>Browse ›</Text>
              </PressableScale>
            </View>
            {loading ? (
              <View style={styles.railSkeleton}>
                <Skeleton height={RAIL_CARD_HEIGHT} width={RAIL_CARD_WIDTH} />
                <Skeleton height={RAIL_CARD_HEIGHT} width={RAIL_CARD_WIDTH} />
              </View>
            ) : recommended.length === 0 ? (
              <EmptyState
                icon={<Ionicons name="sparkles-outline" size={24} color={theme.colors.text.muted} />}
                title="Nothing to recommend yet"
                message="Published papers in your field will appear here."
              />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rail}
              >
                {recommended.map((paper, index) => (
                  <PressableScale
                    key={paper.id}
                    style={styles.railCard}
                    onPress={() =>
                      navigation.navigate('ResearchDetail', { paperId: paper.id })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={paper.title || 'Paper'}
                  >
                    <View style={styles.railBand}>
                      <LinearGradient
                        colors={[theme.colors.brand.primary, theme.colors.border.focus]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      {index === 0 ? (
                        <View style={styles.railTag}>
                          <Text style={styles.railTagText}>MOST READ</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.railBody}>
                      <Text style={styles.railTitle} numberOfLines={3}>
                        {paper.title || 'Untitled'}
                      </Text>
                      <View style={styles.railMeta}>
                        <Ionicons
                          name="eye-outline"
                          size={12}
                          color={theme.colors.text.muted}
                        />
                        <Text style={styles.railMetaText}>{paper.view_count || 0}</Text>
                        {paperYear(paper) ? (
                          <Text style={styles.railMetaText}>{paperYear(paper)}</Text>
                        ) : null}
                      </View>
                    </View>
                  </PressableScale>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Explore by field */}
          {categories.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Explore by field</Text>
                <PressableScale
                  onPress={() => navigation.navigate('Browse')}
                  accessibilityRole="button"
                  accessibilityLabel="Browse all fields"
                  hitSlop={8}
                >
                  <Text style={styles.sectionLink}>All ›</Text>
                </PressableScale>
              </View>
              <View style={styles.fieldGrid}>
                {categories.map((category) => (
                  <PressableScale
                    key={category.id}
                    style={styles.fieldTile}
                    onPress={() =>
                      navigation.navigate('Browse', { categoryId: category.id })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Explore ${category.name}`}
                  >
                    <Text style={styles.fieldTileText} numberOfLines={2}>
                      {category.name}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={15}
                      color={theme.colors.text.muted}
                    />
                  </PressableScale>
                ))}
              </View>
            </View>
          ) : null}

          {/* Saved */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved</Text>
            </View>
            {savedPapers.length === 0 ? (
              <Text style={styles.savedEmpty}>Papers you bookmark will appear here.</Text>
            ) : (
              savedPapers.map((paper, index) => (
                <ListEntranceItem key={paper.id} index={index}>
                  <PressableScale
                    style={styles.savedRow}
                    onPress={() =>
                      navigation.navigate('ResearchDetail', { paperId: paper.id })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={paper.title || 'Saved paper'}
                  >
                    <Ionicons name="bookmark" size={15} color={theme.colors.brand.accent} />
                    <Text style={styles.savedTitle} numberOfLines={2}>
                      {paper.title || 'Untitled'}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={theme.colors.text.muted}
                    />
                  </PressableScale>
                </ListEntranceItem>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingBottom: t.spacing['3xl'],
    },
    body: {
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.xl,
      gap: t.spacing.xl,
    },
    section: {
      gap: t.spacing.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.spacing.sm,
    },
    sectionTitle: {
      flexShrink: 1,
      fontFamily: t.fontFamilies.ui.bold,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: t.colors.text.muted,
    },
    sectionLink: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 13,
      color: t.colors.brand.primary,
    },

    // Submissions glance
    statusStrip: {
      flexDirection: 'row',
      gap: t.spacing.sm,
    },
    statTile: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: t.spacing.md,
      paddingHorizontal: t.spacing.xs,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      backgroundColor: t.colors.surface.raised,
      ...t.shadows.level1,
    },
    statNum: {
      ...t.typography.h2,
      color: t.colors.text.primary,
    },
    statNumWarn: {
      color: t.colors.state.warning,
    },
    statNumGood: {
      color: t.colors.state.success,
    },
    statLabel: {
      ...t.typography.caption,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      color: t.colors.text.muted,
      marginTop: t.spacing.xs,
    },

    // Discovery rail
    rail: {
      gap: t.spacing.md,
      paddingBottom: 2,
    },
    railSkeleton: {
      flexDirection: 'row',
      gap: t.spacing.md,
    },
    railCard: {
      width: RAIL_CARD_WIDTH,
      height: RAIL_CARD_HEIGHT,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      backgroundColor: t.colors.surface.raised,
      overflow: 'hidden',
      ...t.shadows.level1,
    },
    railBand: {
      height: 76,
      justifyContent: 'center',
    },
    railTag: {
      position: 'absolute',
      top: t.spacing.sm,
      left: t.spacing.sm,
      backgroundColor: t.colors.brand.accent,
      borderRadius: t.radii.pill,
      paddingHorizontal: t.spacing.sm,
      paddingVertical: 3,
    },
    railTagText: {
      fontFamily: t.fontFamilies.ui.bold,
      fontSize: 9,
      letterSpacing: 0.4,
      color: '#3A2600',
    },
    railBody: {
      flex: 1,
      padding: t.spacing.md,
      justifyContent: 'space-between',
    },
    railTitle: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 14,
      lineHeight: 19,
      color: t.colors.text.primary,
    },
    railMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
    },
    railMetaText: {
      ...t.typography.caption,
      color: t.colors.text.muted,
    },

    // Explore by field — two-column tile grid (bigger tap targets than the old
    // chip row, and always renders as a filled shelf).
    fieldGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: t.spacing.sm,
    },
    fieldTile: {
      width: '48%',
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      backgroundColor: t.colors.surface.raised,
      ...t.shadows.level1,
    },
    fieldTileText: {
      flex: 1,
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 13,
      lineHeight: 17,
      color: t.colors.text.primary,
    },

    // Saved
    savedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
      paddingVertical: t.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.colors.border.subtle,
    },
    savedTitle: {
      flex: 1,
      fontFamily: t.fontFamilies.display.regular,
      fontSize: 14,
      lineHeight: 20,
      color: t.colors.text.primary,
    },
    savedEmpty: {
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 14,
      color: t.colors.text.muted,
    },
  });
