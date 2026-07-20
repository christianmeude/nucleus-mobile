import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { researchApi } from '../../api/research';
import { getSavedPaperIds, togglePaperSaved } from '../../api/collections';
import { RootStackParamList } from '../../navigation/types';
import { Category, ResearchPaper, WorkflowEntry } from '../../types/domain';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { motion, type Theme } from '../../theme';
import {
  EmptyState,
  InlineNotice,
  PressableScale,
  Screen,
  SheetPresenter,
} from '../../components/ui';
import { PdfViewer } from '../../components/PdfViewer';
import { AnnotationPanel } from '../../components/AnnotationPanel';
import {
  formatDate,
  getPrimaryAuthorName,
  listCoAuthorNames,
  paperDate,
  statusToLabel,
} from '../../utils/format';
import { buildCategoryNameById, resolveCategoryName } from '../../utils/category';
import { PUBLISHED_STATUSES } from '../../components/PaperStatusChip';

type DetailRouteProp = RouteProp<RootStackParamList, 'ResearchDetail'>;

const MAX_RELATED = 3;

const timeOf = (paper: ResearchPaper) => new Date(paperDate(paper) || 0).getTime();
const yearOf = (paper: ResearchPaper) => {
  const value = paperDate(paper);
  const year = value ? new Date(value).getFullYear() : NaN;
  return Number.isNaN(year) ? '' : String(year);
};

export const ResearchDetailScreen = () => {
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { theme, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { paperId } = route.params;

  const [paper, setPaper] = useState<ResearchPaper | null>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [related, setRelated] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileError, setFileError] = useState('');
  const [saved, setSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const reducedMotion = useReducedMotion();
  // Bookmark "pop": a quick spring overshoot on the icon when a paper is saved,
  // confirming the action. No-op under reduced motion.
  const savePop = useSharedValue(1);
  const savePopStyle = useAnimatedStyle(() => ({
    transform: [{ scale: savePop.value }],
  }));
  const [error, setError] = useState('');
  const [pdfOpen, setPdfOpen] = useState(false);
  // Track a view the first time the reader actually opens the PDF, once per screen
  // visit — the sheet unmounts on close, so without this guard each re-open would
  // remount PdfViewer and re-fire onFirstLoad, over-counting views.
  const viewTracked = useRef(false);

  // Hide the stack header while the paper sheet is open so the whole screen —
  // header included — scales away behind the sheet, leaving only the sheet on
  // screen. Restored on close.
  useEffect(() => {
    navigation.setOptions({ headerShown: !pdfOpen });
  }, [navigation, pdfOpen]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');

      try {
        const detail = await researchApi.getResearchById(paperId);
        
        const [categoryRows, relatedRows, savedIds, fetchedAnns] = await Promise.all([
          researchApi.getCategories(),
          researchApi.getRelatedPapers(detail.paper, MAX_RELATED).catch(() => []),
          getSavedPaperIds().catch(() => [] as string[]),
          researchApi.fetchAnnotations(paperId).catch(() => []),
        ]);

        setPaper(detail.paper);
        setWorkflow(detail.workflowHistory || []);
        setCategories(categoryRows);
        setRelated(relatedRows);
        setSaved(savedIds.includes(paperId));
        setAnnotations(fetchedAnns);
      } catch (_error) {
        setError('Unable to load paper details.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [paperId]);

  // Resolve the (possibly signed) file URL on mount so the inline PdfViewer can render it.
  // trackView is deferred to the viewer's first-render callback (see onFirstLoad below).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setFileError('');
        const resolved = await researchApi.getResearchFile(paperId);
        if (active) setFileUri(resolved.fileUrl);
      } catch (_error) {
        if (active) setFileError('Unable to load the paper file.');
      }
    })();
    return () => {
      active = false;
    };
  }, [paperId]);

  const categoryNameById = useMemo(() => buildCategoryNameById(categories), [categories]);

  const handleToggleSave = async () => {
    if (savePending) return;
    setSavePending(true);
    const next = !saved;
    setSaved(next);
    // Pop only when saving (not when un-saving) — it reads as a confirming beat.
    if (next && !reducedMotion) {
      savePop.value = withSequence(
        withTiming(1.32, { duration: 120 }),
        withSpring(1, motion.spring.pop)
      );
    }
    try {
      const nowSaved = await togglePaperSaved(paperId);
      setSaved(nowSaved);
    } catch {
      setSaved((prev) => !prev);
    } finally {
      setSavePending(false);
    }
  };

  if (loading) {
    return (
      <Screen edges={{ top: false }} style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.brand.primary} />
        <Text style={styles.loaderText}>Loading paper...</Text>
      </Screen>
    );
  }

  if (!paper) {
    return (
      <Screen edges={{ top: false }} style={styles.loaderContainer}>
        <EmptyState
          icon={<Ionicons name="document-outline" size={24} color={theme.colors.text.muted} />}
          title="Paper not found"
          message={error || 'Unable to load paper details.'}
        />
      </Screen>
    );
  }

  const isOwner =
    paper.structured_authors?.some((e) => e.is_primary && e.user_id === user?.id) ?? false;
  // Workflow history carries reviewer↔author comments — show it only to the owner while the
  // paper is still in review. Once approved/published it is a public artifact (this is the
  // only status Browse surfaces), so the workflow stays hidden for everyone.
  const showWorkflow =
    isOwner && paper.status !== 'approved' && paper.status !== 'published';
  // Related papers only make sense once a paper is a public repository entry — for a
  // paper still in review (only reachable from Dashboard/My Papers), there's nothing
  // published yet to meaningfully relate it to.
  const isRepositoryPaper = PUBLISHED_STATUSES.has(paper.status);
  const keywords = Array.isArray(paper.keywords) ? paper.keywords.filter(Boolean) : [];
  const categoryName = resolveCategoryName(paper.category, categoryNameById);
  const authorName = getPrimaryAuthorName(paper);
  const coAuthorNames = listCoAuthorNames(paper);
  const coAuthorList =
    coAuthorNames !== 'None'
      ? coAuthorNames.split(',').map((name) => name.trim()).filter(Boolean)
      : [];
  const authorsLine = [authorName, ...coAuthorList].join('  ·  ');
  const displayDate = paper.published_date || paper.created_at;

  return (
    <SheetPresenter
      open={pdfOpen}
      onClose={() => setPdfOpen(false)}
      sheetAccessibilityLabel={`Full paper: ${paper.title}`}
      sheet={
        fileUri ? (
          <PdfViewer
            uri={fileUri}
            variant="fill"
            onFirstLoad={() => {
              if (viewTracked.current) return;
              viewTracked.current = true;
              researchApi.trackView(paperId).catch(() => undefined);
            }}
          />
        ) : null
      }
    >
      <Screen edges={{ top: false }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {categoryName ? <Text style={styles.eyebrow}>{categoryName}</Text> : null}

        <Text style={styles.title}>{paper.title}</Text>

        <Text style={styles.authors}>{authorsLine}</Text>
        {paper.department ? <Text style={styles.affiliation}>{paper.department}</Text> : null}

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formatDate(displayDate)}</Text>
          <Text style={styles.metaSep}>/</Text>
          <Text style={styles.metaText}>{paper.view_count || 0} views</Text>
          <Text style={styles.metaSep}>/</Text>
          <Text style={styles.metaText}>{paper.download_count || 0} downloads</Text>
        </View>

        {/* Download is intentionally hidden pending backend allow_download support (Issue #8). */}
        <View style={styles.readRow}>
          {annotations.length > 0 ? (
            <PressableScale
              style={styles.feedbackBtn}
              onPress={() => setPanelOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="View feedback"
            >
              <Ionicons name="chatbubbles-outline" size={20} color={theme.colors.text.secondary} />
              <Text style={styles.feedbackBtnText}>Feedback ({annotations.length})</Text>
            </PressableScale>
          ) : null}
          <PressableScale
            style={styles.bookmarkBtn}
            onPress={handleToggleSave}
            disabled={savePending}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from saved' : 'Save paper'}
          >
            <Animated.View style={savePopStyle}>
              <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={saved ? theme.colors.brand.accent : theme.colors.text.muted}
              />
            </Animated.View>
          </PressableScale>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Paper</Text>
          {fileError ? (
            <InlineNotice tone="danger" message={fileError} />
          ) : (
            <PressableScale
              style={styles.previewCard}
              onPress={() => setPdfOpen(true)}
              disabled={!fileUri}
              accessibilityRole="button"
              accessibilityLabel="View full paper"
              accessibilityState={{ disabled: !fileUri }}
            >
              {fileUri ? (
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  <PdfViewer uri={fileUri} variant="preview" />
                </View>
              ) : null}
              {/* Frost the page behind the button; a soft scrim guarantees the
                  button reads even where a platform's blur is weak. */}
              <BlurView
                intensity={28}
                tint={scheme === 'dark' ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.previewScrim} pointerEvents="none" />
              <View style={styles.previewButton} pointerEvents="none">
                <Ionicons name="document-text" size={18} color={theme.colors.text.onBrand} />
                <Text style={styles.previewButtonText}>View Full Paper</Text>
              </View>
            </PressableScale>
          )}
        </View>

        {error ? <InlineNotice tone="danger" message={error} /> : null}

        {keywords.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Keywords</Text>
            <View style={styles.keywordsWrap}>
              {keywords.map((keyword) => (
                <View key={keyword} style={styles.keywordTag}>
                  <Text style={styles.keywordText}>{keyword}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Abstract</Text>
          <Text style={styles.abstract}>{paper.abstract || 'No abstract available.'}</Text>
        </View>

        {isRepositoryPaper && related.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Related papers</Text>
            <View style={styles.relatedList}>
              {related.map((item) => {
                const relatedCategory = resolveCategoryName(item.category, categoryNameById);
                const relatedYear = yearOf(item);
                return (
                  <PressableScale
                    key={item.id}
                    style={styles.relatedRow}
                    onPress={() => navigation.push(route.name, { paperId: item.id })}
                    accessibilityRole="button"
                    accessibilityLabel={item.title || 'Untitled paper'}
                  >
                    <View style={styles.relatedMark} />
                    <View style={styles.relatedBody}>
                      {relatedCategory ? (
                        <Text style={styles.relatedCat}>{relatedCategory}</Text>
                      ) : null}
                      <Text style={styles.relatedTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.relatedAuthor} numberOfLines={1}>
                        {getPrimaryAuthorName(item)}
                        {relatedYear ? `  ·  ${relatedYear}` : ''}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        ) : null}

        {showWorkflow ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Workflow history</Text>
            {workflow.length === 0 ? (
              <Text style={styles.workflowEmpty}>No workflow history available.</Text>
            ) : (
              <View style={styles.workflowList}>
                {workflow.map((entry, index) => (
                  <View
                    key={entry.id}
                    style={[styles.workflowRow, index === 0 ? styles.workflowRowCurrent : null]}
                  >
                    {index === 0 ? <View style={styles.workflowBar} /> : null}
                    <View style={styles.workflowBody}>
                      <Text style={styles.workflowName}>
                        {statusToLabel(entry.status) || entry.action_type || 'Updated'}
                      </Text>
                      {entry.reviewer_role ? (
                        <Text style={styles.workflowMeta}>Reviewer: {entry.reviewer_role}</Text>
                      ) : null}
                      {entry.comments ? (
                        <Text style={styles.workflowComment}>{entry.comments}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.workflowDate}>
                      {formatDate(entry.reviewed_at || entry.created_at)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
      </Screen>
      <AnnotationPanel
        annotations={annotations}
        visible={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </SheetPresenter>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing['3xl'],
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  loaderText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.secondary,
  },
  eyebrow: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.brand.primary,
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.display,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  authors: {
    fontFamily: theme.fontFamilies.display.regular,
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  affiliation: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.muted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.subtle,
  },
  metaText: {
    ...theme.typography.metadata,
    color: theme.colors.text.secondary,
  },
  metaSep: {
    ...theme.typography.metadata,
    color: theme.colors.border.strong,
  },
  readRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radii.md,
  },
  feedbackBtnText: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text.secondary,
  },
  bookmarkBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radii.md,
  },
  section: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  previewCard: {
    height: 260,
    borderRadius: theme.radii.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: theme.colors.surface.sunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.brand.primary,
    ...theme.shadows.level2,
  },
  previewButtonText: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text.onBrand,
  },
  sectionLabel: {
    ...theme.typography.label,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.colors.text.muted,
  },
  keywordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  keywordTag: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surface.raised,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  keywordText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.secondary,
  },
  abstract: {
    fontFamily: theme.fontFamilies.display.regular,
    fontSize: 16,
    lineHeight: 26,
    color: theme.colors.text.primary,
  },
  relatedList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border.subtle,
  },
  relatedRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.subtle,
  },
  relatedMark: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: theme.radii.pill,
    backgroundColor: theme.palette.navy[300],
  },
  relatedBody: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  relatedCat: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: theme.colors.text.muted,
  },
  relatedTitle: {
    fontFamily: theme.fontFamilies.display.semibold,
    fontSize: 14,
    lineHeight: 19,
    color: theme.colors.text.primary,
  },
  relatedAuthor: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
  },
  workflowList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border.subtle,
  },
  workflowRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.subtle,
  },
  workflowRowCurrent: {
    paddingLeft: theme.spacing.md,
  },
  workflowBar: {
    position: 'absolute',
    left: 0,
    top: theme.spacing.md,
    bottom: theme.spacing.md,
    width: 3,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.brand.accent,
  },
  workflowBody: {
    flex: 1,
    gap: 2,
  },
  workflowName: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text.primary,
  },
  workflowMeta: {
    ...theme.typography.metadata,
    color: theme.colors.text.muted,
  },
  workflowComment: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.secondary,
  },
  workflowDate: {
    fontFamily: theme.fontFamilies.display.regular,
    fontSize: 13,
    color: theme.colors.text.muted,
  },
  workflowEmpty: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.muted,
  },
});
