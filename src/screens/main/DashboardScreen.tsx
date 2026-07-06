import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { useActivityCount } from '../../hooks/useActivityCount';
import { researchApi } from '../../api/research';
import { getSavedPapers, SavedPaper } from '../../api/collections';
import { Category, PaperStatus, ResearchPaper } from '../../types/domain';
import { getPrimaryAuthorName, paperDate } from '../../utils/format';
import { type Theme } from '../../theme';
import { ResearchCard } from '../../components/ResearchCard';
import { ListEntranceItem } from '../../components/ListEntranceItem';
import { Chip, EmptyState, InlineNotice, Skeleton } from '../../components/ui';
import {
  ACTION_STATUSES,
  ACTIVE_STATUSES,
} from '../../components/PaperStatusChip';

/**
 * `linear-gradient(158deg, primary, primary-hover)` (DESIGN.md, Dashboard A3).
 * expo-linear-gradient takes normalized start/end points rather than a CSS
 * angle, so 158deg is pre-converted here: for an angle `a` (CSS convention,
 * 0deg = up, clockwise), the direction vector is (sin a, -cos a); start/end
 * straddle the center by half that vector. Kept as constants so the exact
 * spec angle is traceable back to this comment instead of "close enough"
 * numbers.
 */
const HERO_GRADIENT_START = { x: 0.313, y: 0.036 };
const HERO_GRADIENT_END = { x: 0.687, y: 0.964 };

/** Simplified 4-stage tracker shown for the single most relevant in-progress
 * submission. Dean / program-chair / editor / admin reviewer stages all
 * collapse into the one "Dean" step the mockup shows. */
const STAGE_LABELS = ['Submitted', 'Faculty', 'Dean', 'Published'] as const;

const STAGE_INDEX: Partial<Record<PaperStatus, number>> = {
  pending: 1,
  pending_faculty: 1,
  pending_dean: 2,
  pending_program_chair: 2,
  pending_editor: 2,
  pending_admin: 2,
  approved: 3,
  published: 3,
};

const initialsFor = (fullName?: string | null) => {
  const name = fullName?.trim();
  if (!name) return '?';
  const parts = name.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const greetingForHour = (hour: number) => {
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
};

const viewsOf = (paper: ResearchPaper) => paper.view_count || 0;

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const activityCount = useActivityCount();
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [savedPapers, setSavedPapers] = useState<SavedPaper[]>([]);
  const [explorePapers, setExplorePapers] = useState<ResearchPaper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
    // Explore is a supplementary section — a failed fetch just hides it
    // rather than surfacing an error, same ambient-failure posture as the
    // activity badge.
    setExplorePapers(publishedResult.status === 'fulfilled' ? publishedResult.value : []);
    setCategories(categoriesResult.status === 'fulfilled' ? categoriesResult.value : []);

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

  const statusLine = useMemo(() => {
    if (papers.length === 0) return null;
    const needsAction = papers.filter((p) => ACTION_STATUSES.has(p.status)).length;
    if (needsAction > 0) {
      return {
        text: `${needsAction} paper${needsAction === 1 ? '' : 's'} need${needsAction === 1 ? 's' : ''} revision`,
        urgent: true,
      };
    }
    const active = papers.filter((p) => ACTIVE_STATUSES.has(p.status)).length;
    if (active > 0) {
      return { text: `${active} paper${active === 1 ? '' : 's'} in review`, urgent: false };
    }
    return { text: 'All papers are up to date', urgent: false };
  }, [papers]);

  const recentPapers = useMemo(() => {
    return [...papers]
      .sort((a, b) => {
        const aDate = new Date(paperDate(a) || 0).getTime();
        const bDate = new Date(paperDate(b) || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 3);
  }, [papers]);

  /** The single most-recently-touched actively-progressing submission, used
   * to drive the stage-progress card. Papers needing the student's action
   * (revision/rejected) don't fit the happy-path tracker, so they're excluded
   * here — they already surface via the urgent status line above. */
  const inProgressPaper = useMemo(() => {
    const active = papers.filter((p) => ACTIVE_STATUSES.has(p.status));
    if (active.length === 0) return null;
    return [...active].sort((a, b) => {
      const aDate = new Date(a.updated_at || paperDate(a) || 0).getTime();
      const bDate = new Date(b.updated_at || paperDate(b) || 0).getTime();
      return bDate - aDate;
    })[0];
  }, [papers]);

  const currentStage = inProgressPaper ? STAGE_INDEX[inProgressPaper.status] ?? 0 : 0;

  const exploreFeatured = useMemo(() => {
    if (explorePapers.length === 0) return null;
    return [...explorePapers].sort((a, b) => viewsOf(b) - viewsOf(a))[0];
  }, [explorePapers]);

  // Dashboard's chips are a shortcut into Browse, not a local filter — Browse
  // owns its own category-filter state, so there's nothing to persist here
  // once the navigation fires.
  const openCategory = useCallback(() => navigation.navigate('Browse'), [navigation]);

  return (
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
      <View style={styles.hero}>
        <LinearGradient
          colors={[theme.colors.brand.primary, theme.colors.brand.primaryHover]}
          start={HERO_GRADIENT_START}
          end={HERO_GRADIENT_END}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.heroGlow, { backgroundColor: theme.colors.brand.accent }]} />
        <Text style={[styles.heroWatermark, { color: theme.colors.text.onBrand }]}>N</Text>

        <View style={[styles.heroContent, { paddingTop: insets.top + theme.spacing.md }]}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroGreeting}>{greeting}</Text>
            <Text style={styles.heroName} numberOfLines={1}>
              {firstName || 'Student'}
            </Text>
            {statusLine ? (
              <Text
                style={[styles.heroSubLine, statusLine.urgent && styles.heroSubLineUrgent]}
              >
                {statusLine.text}
              </Text>
            ) : null}
          </View>

          <View style={styles.heroActions}>
            <Pressable
              onPress={() => navigation.navigate('Activity')}
              style={({ pressed }) => [styles.heroIconButton, pressed && styles.heroPressed]}
              accessibilityRole="button"
              accessibilityLabel="Activity"
              hitSlop={8}
            >
              <Ionicons name="notifications-outline" size={20} color={theme.colors.text.onBrand} />
              {activityCount > 0 ? (
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>
                    {activityCount > 99 ? '99+' : activityCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('Profile')}
              style={({ pressed }) => [styles.heroAvatar, pressed && styles.heroPressed]}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              <Text style={styles.heroAvatarText}>{initials}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {error ? <InlineNotice tone="danger" message={error} /> : null}

        <Pressable
          style={({ pressed }) => [styles.submitCta, pressed && styles.submitCtaPressed]}
          onPress={() => navigation.navigate('SubmitResearch')}
          accessibilityRole="button"
          accessibilityLabel="Submit your research"
        >
          <View style={styles.submitCtaIconTile}>
            <Ionicons name="document-text-outline" size={22} color={theme.colors.brand.primary} />
          </View>
          <Text style={styles.submitCtaLabel}>Submit your research</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.brand.accent} />
        </Pressable>

        {inProgressPaper ? (
          <View style={styles.stageCard}>
            <Text style={styles.sectionTitle}>In progress</Text>
            <Text style={styles.stageCardTitle} numberOfLines={1}>
              {inProgressPaper.title}
            </Text>

            <View style={styles.stageTrack}>
              {STAGE_LABELS.flatMap((label, i) => {
                const nodes = [];
                if (i > 0) {
                  nodes.push(
                    <View
                      key={`line-${label}`}
                      style={[styles.stageLine, i - 1 < currentStage && styles.stageLineDone]}
                    />
                  );
                }
                nodes.push(
                  <View key={`dot-${label}`} style={styles.stageDotSlot}>
                    {i === currentStage ? (
                      <View
                        style={[
                          styles.stageRingDecor,
                          { backgroundColor: theme.colors.brand.accent },
                        ]}
                      />
                    ) : null}
                    <View
                      style={[
                        styles.stageDot,
                        i < currentStage && styles.stageDotDone,
                        i === currentStage && styles.stageDotCurrent,
                      ]}
                    />
                  </View>
                );
                return nodes;
              })}
            </View>
            <View style={styles.stageLabels}>
              {STAGE_LABELS.map((label, i) => (
                <Text
                  key={label}
                  style={[styles.stageLabel, i <= currentStage && styles.stageLabelActive]}
                >
                  {label}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent papers</Text>
          {loading ? (
            <View style={styles.skeletonList}>
              <Skeleton height={108} />
              <Skeleton height={108} />
            </View>
          ) : recentPapers.length === 0 ? (
            <EmptyState
              icon={
                <Ionicons name="documents-outline" size={24} color={theme.colors.text.muted} />
              }
              title="No papers yet"
              message="Your recent papers will appear here."
            />
          ) : (
            recentPapers.map((paper, index) => (
              <ListEntranceItem key={paper.id} index={index}>
                <ResearchCard
                  paper={paper}
                  onPress={() => navigation.navigate('ResearchDetail', { paperId: paper.id })}
                />
              </ListEntranceItem>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved</Text>
          {savedPapers.length === 0 ? (
            <Text style={styles.savedEmpty}>Papers you bookmark will appear here.</Text>
          ) : (
            savedPapers.map((paper) => (
              <Pressable
                key={paper.id}
                style={({ pressed }) => [styles.savedRow, pressed && styles.savedRowPressed]}
                onPress={() => navigation.navigate('ResearchDetail', { paperId: paper.id })}
                accessibilityRole="button"
                accessibilityLabel={paper.title || 'Saved paper'}
              >
                <Ionicons name="bookmark" size={15} color={theme.colors.brand.accent} />
                <Text style={styles.savedTitle} numberOfLines={2}>
                  {paper.title || 'Untitled'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.text.muted} />
              </Pressable>
            ))
          )}
        </View>

        {categories.length > 0 || exploreFeatured ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Explore</Text>

            {categories.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                <Chip label="All" active onPress={openCategory} />
                {categories.map((category) => (
                  <Chip key={category.id} label={category.name} onPress={openCategory} />
                ))}
              </ScrollView>
            ) : null}

            {exploreFeatured ? (
              <Pressable
                style={styles.featuredCard}
                onPress={() =>
                  navigation.navigate('ResearchDetail', { paperId: exploreFeatured.id })
                }
                accessibilityRole="button"
                accessibilityLabel={`Most read paper: ${exploreFeatured.title || 'Untitled paper'}`}
              >
                <Text style={styles.featuredTag}>MOST READ</Text>
                <Text style={styles.featuredTitle} numberOfLines={2}>
                  {exploreFeatured.title}
                </Text>
                <View style={styles.featuredMeta}>
                  <Text style={styles.featuredMetaText} numberOfLines={1}>
                    {getPrimaryAuthorName(exploreFeatured)}
                  </Text>
                  <Text style={styles.featuredMetaSep}>·</Text>
                  <Text style={styles.featuredMetaText}>{viewsOf(exploreFeatured)} views</Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.surface.base,
    },
    content: {
      paddingBottom: t.spacing['3xl'],
    },
    hero: {
      overflow: 'hidden',
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      borderCurve: 'continuous',
    },
    heroGlow: {
      position: 'absolute',
      top: -60,
      right: -60,
      width: 180,
      height: 180,
      borderRadius: t.radii.pill,
      opacity: 0.18,
    },
    heroWatermark: {
      position: 'absolute',
      right: -18,
      bottom: -36,
      fontSize: 168,
      lineHeight: 168,
      fontFamily: t.fontFamilies.display.bold,
      opacity: 0.05,
    },
    heroContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: t.spacing.lg,
      paddingBottom: t.spacing.xl,
      gap: t.spacing.md,
    },
    heroTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    heroGreeting: {
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 14,
      color: t.colors.text.onBrand,
      opacity: 0.75,
    },
    heroName: {
      ...t.typography.h1,
      color: t.colors.text.onBrand,
      marginTop: 2,
    },
    heroSubLine: {
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 13,
      color: t.colors.text.onBrand,
      opacity: 0.75,
      marginTop: t.spacing.xs,
    },
    heroSubLineUrgent: {
      fontFamily: t.fontFamilies.ui.semibold,
      opacity: 1,
    },
    heroActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
    },
    heroIconButton: {
      // 44x44 minimum tap target (DESIGN.md Layout) even though the visual
      // glyph reads smaller inside it.
      width: 44,
      height: 44,
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.14)',
    },
    heroPressed: {
      opacity: 0.7,
    },
    heroBadge: {
      position: 'absolute',
      top: 2,
      right: 2,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 4,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brand.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroBadgeText: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 9,
      lineHeight: 13,
      color: t.colors.text.onAccent,
      fontVariant: ['tabular-nums'],
    },
    heroAvatar: {
      width: 44,
      height: 44,
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    heroAvatarText: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 14,
      color: t.colors.text.onBrand,
    },
    body: {
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.xl,
      gap: t.spacing.xl,
    },
    submitCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.md,
      padding: t.spacing.lg,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      backgroundColor: t.colors.surface.raised,
      ...t.shadows.level1,
    },
    submitCtaPressed: {
      opacity: 0.85,
    },
    submitCtaIconTile: {
      width: 44,
      height: 44,
      borderRadius: t.radii.md,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.brand.primarySurface,
    },
    submitCtaLabel: {
      flex: 1,
      ...t.typography.bodyStrong,
      color: t.colors.text.primary,
    },
    stageCard: {
      padding: t.spacing.lg,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      backgroundColor: t.colors.surface.raised,
      gap: t.spacing.md,
    },
    stageCardTitle: {
      ...t.typography.h3,
      color: t.colors.text.primary,
      marginTop: -t.spacing.sm,
    },
    stageTrack: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    stageLine: {
      flex: 1,
      height: 2,
      backgroundColor: t.colors.border.subtle,
    },
    stageLineDone: {
      backgroundColor: t.colors.state.success,
    },
    stageDotSlot: {
      width: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stageRingDecor: {
      position: 'absolute',
      width: 18,
      height: 18,
      borderRadius: t.radii.pill,
      opacity: 0.25,
    },
    stageDot: {
      width: 10,
      height: 10,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.surface.raised,
      borderWidth: 2,
      borderColor: t.colors.border.subtle,
    },
    stageDotDone: {
      backgroundColor: t.colors.state.success,
      borderWidth: 0,
    },
    stageDotCurrent: {
      backgroundColor: t.colors.brand.accent,
      borderWidth: 0,
    },
    stageLabels: {
      flexDirection: 'row',
    },
    stageLabel: {
      flex: 1,
      textAlign: 'center',
      ...t.typography.caption,
      color: t.colors.text.disabled,
    },
    stageLabelActive: {
      color: t.colors.text.primary,
      fontFamily: t.fontFamilies.ui.semibold,
    },
    section: {
      gap: t.spacing.sm,
    },
    sectionTitle: {
      ...t.typography.h3,
      color: t.colors.text.primary,
    },
    skeletonList: {
      gap: t.spacing.sm,
    },
    savedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
      paddingVertical: t.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.colors.border.subtle,
    },
    savedRowPressed: {
      opacity: 0.6,
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
    chipsRow: {
      flexDirection: 'row',
      gap: t.spacing.sm,
      paddingRight: t.spacing.lg,
      paddingBottom: t.spacing.xs,
    },
    featuredCard: {
      marginTop: t.spacing.sm,
      backgroundColor: t.colors.brand.primary,
      borderRadius: t.radii.xl,
      borderCurve: 'continuous',
      padding: t.spacing.xl,
      overflow: 'hidden',
    },
    featuredTag: {
      ...t.typography.label,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      color: t.colors.brand.accent,
      marginBottom: t.spacing.sm,
    },
    featuredTitle: {
      fontFamily: t.fontFamilies.display.semibold,
      fontSize: 20,
      lineHeight: 26,
      color: t.colors.text.onBrand,
      marginBottom: t.spacing.md,
    },
    featuredMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
    },
    featuredMetaText: {
      ...t.typography.caption,
      color: 'rgba(255, 255, 255, 0.6)',
      flexShrink: 1,
    },
    featuredMetaSep: {
      ...t.typography.caption,
      color: 'rgba(255, 255, 255, 0.3)',
    },
  });
