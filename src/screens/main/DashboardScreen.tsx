import { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { researchApi } from '../../api/research';
import { getSavedPapers, SavedPaper } from '../../api/collections';
import { ResearchPaper } from '../../types/domain';
import { greetingForHour, initialsFor, paperDate } from '../../utils/format';
import { type Theme } from '../../theme';
import { ResearchCard } from '../../components/ResearchCard';
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
} from '../../components/PaperStatusChip';

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [savedPapers, setSavedPapers] = useState<SavedPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const [papersResult, savedResult] = await Promise.allSettled([
      researchApi.getMyPapers(),
      getSavedPapers(3),
    ]);

    if (papersResult.status === 'fulfilled') {
      setPapers(papersResult.value);
      setError('');
    } else {
      setError('Failed to load dashboard data.');
    }
    if (savedResult.status === 'fulfilled') setSavedPapers(savedResult.value);

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

  return (
    // Top edge intentionally opted out of Screen's own inset padding: the hero
    // band below is meant to bleed under the status bar, so its safe-area
    // clearance is applied to the hero itself (not to Screen's outer box).
    // Bottom edge is opted out too — the floating tab bar already owns it.
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
        statusLine={statusLine}
        onPressAvatar={() => navigation.navigate('Profile')}
      />

      <View style={styles.body}>
        {error ? <InlineNotice tone="danger" message={error} /> : null}

        <PressableScale
          style={styles.submitCta}
          onPress={() => navigation.navigate('SubmitResearch')}
          accessibilityRole="button"
          accessibilityLabel="Submit your research"
        >
          <View style={styles.submitCtaIconTile}>
            <Ionicons name="document-text-outline" size={22} color={theme.colors.brand.primary} />
          </View>
          <Text style={styles.submitCtaLabel}>Submit your research</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.brand.accent} />
        </PressableScale>

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
              <PressableScale
                key={paper.id}
                style={styles.savedRow}
                onPress={() => navigation.navigate('ResearchDetail', { paperId: paper.id })}
                accessibilityRole="button"
                accessibilityLabel={paper.title || 'Saved paper'}
              >
                <Ionicons name="bookmark" size={15} color={theme.colors.brand.accent} />
                <Text style={styles.savedTitle} numberOfLines={2}>
                  {paper.title || 'Untitled'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.text.muted} />
              </PressableScale>
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
