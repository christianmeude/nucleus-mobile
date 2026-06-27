import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { researchApi } from '../../api/research';
import { RootStackParamList } from '../../navigation/types';
import { Category, ResearchPaper, WorkflowEntry } from '../../types/domain';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../theme';
import { Button, EmptyState, InlineNotice } from '../../components/ui';
import {
  formatDate,
  formatRelativeTime,
  getPrimaryAuthorName,
  listCoAuthorNames,
  paperDate,
  statusToLabel,
} from '../../utils/format';

type DetailRouteProp = RouteProp<RootStackParamList, 'ResearchDetail'>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const { paperId } = route.params;

  const [paper, setPaper] = useState<ResearchPaper | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [published, setPublished] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingFile, setOpeningFile] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');

      try {
        // Related papers are a client-side heuristic for now (same category + shared
        // keywords); semantic relatedness is deferred to the Hybrid Search merge.
        const [detail, categoryRows, publishedRows] = await Promise.all([
          researchApi.getResearchById(paperId),
          researchApi.getCategories(),
          researchApi.getPublishedPapers(),
        ]);
        setPaper(detail.paper);
        setWorkflow(detail.workflowHistory || []);
        setCategories(categoryRows);
        setPublished(publishedRows);
      } catch (_error) {
        setError('Unable to load paper details.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [paperId]);

  const categoryNameById = useMemo(
    () => new Map(categories.map((item) => [item.id, item.name])),
    [categories]
  );

  /** Display-only category name, UUID-guarded (Issue #5). Null when nothing resolves. */
  const categoryNameForDisplay = useMemo(() => {
    return (value?: string | null): string | null => {
      if (!value) return null;
      if (categoryNameById.has(value)) {
        const name = categoryNameById.get(value);
        return name && name.trim() ? name : null;
      }
      if (!UUID_PATTERN.test(value)) return value;
      return null;
    };
  }, [categoryNameById]);

  /** Same category (weighted) + shared keywords; excludes the current paper. */
  const related = useMemo(() => {
    if (!paper) return [];
    const currentKeywords = new Set(
      (Array.isArray(paper.keywords) ? paper.keywords : []).map((k) => k.toLowerCase())
    );

    return published
      .filter((candidate) => candidate.id !== paper.id)
      .map((candidate) => {
        const sameCategory =
          candidate.category && paper.category && candidate.category === paper.category ? 2 : 0;
        const sharedKeywords = (Array.isArray(candidate.keywords) ? candidate.keywords : []).filter(
          (k) => currentKeywords.has(k.toLowerCase())
        ).length;
        return { paper: candidate, score: sameCategory + sharedKeywords };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || timeOf(right.paper) - timeOf(left.paper))
      .slice(0, MAX_RELATED)
      .map((entry) => entry.paper);
  }, [paper, published]);

  const openFile = async () => {
    if (!paper) return;
    setOpeningFile(true);

    try {
      try {
        await researchApi.trackView(paperId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to track view.');
      }

      const resolved = await researchApi.getResearchFile(paperId);
      const url = resolved.fileUrl || paper.file_url;

      if (!url) {
        setError('File URL is unavailable for this paper.');
        return;
      }

      // NOTE: opens the signed URL in the system browser. Swapped to the shared in-app
      // PdfViewer after the faculty-access mini-merge + dev-client rebuild.
      await WebBrowser.openBrowserAsync(url);
    } catch (_error) {
      setError('Unable to open paper file.');
    } finally {
      setOpeningFile(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.brand.primary} />
        <Text style={styles.loaderText}>Loading paper...</Text>
      </View>
    );
  }

  if (!paper) {
    return (
      <View style={styles.loaderContainer}>
        <EmptyState
          icon={<Ionicons name="document-outline" size={24} color={theme.colors.text.muted} />}
          title="Paper not found"
          message={error || 'Unable to load paper details.'}
        />
      </View>
    );
  }

  const isOwner =
    paper.structured_authors?.some((e) => e.is_primary && e.user_id === user?.id) ?? false;
  // Workflow history carries reviewer↔author comments — show it only to the owner while the
  // paper is still in review. Once approved/published it is a public artifact (this is the
  // only status Browse surfaces), so the workflow stays hidden for everyone.
  const showWorkflow =
    isOwner && paper.status !== 'approved' && paper.status !== 'published';
  const keywords = Array.isArray(paper.keywords) ? paper.keywords.filter(Boolean) : [];
  const categoryName = categoryNameForDisplay(paper.category);
  const authorName = getPrimaryAuthorName(paper);
  const coAuthorNames = listCoAuthorNames(paper);
  const coAuthorList =
    coAuthorNames !== 'None'
      ? coAuthorNames.split(',').map((name) => name.trim()).filter(Boolean)
      : [];
  const authorsLine = [authorName, ...coAuthorList].join('  ·  ');
  const displayDate = paper.published_date || paper.created_at;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
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

        <View style={styles.readBtn}>
          {/* Download is intentionally hidden pending backend allow_download support (Issue #8). */}
          <Button
            label="Read paper"
            variant="primary"
            onPress={openFile}
            loading={openingFile}
            disabled={openingFile}
          />
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

        {related.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Related papers</Text>
            <View style={styles.relatedList}>
              {related.map((item) => {
                const relatedCategory = categoryNameForDisplay(item.category);
                const relatedYear = yearOf(item);
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [styles.relatedRow, pressed ? styles.pressed : null]}
                    onPress={() => navigation.push('ResearchDetail', { paperId: item.id })}
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
                  </Pressable>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.surface.base,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface.base,
  },
  content: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing['3xl'],
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface.base,
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
    fontFamily: theme.fontFamilies.display.semibold,
    fontSize: 26,
    lineHeight: 32,
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
  readBtn: {
    marginTop: theme.spacing.lg,
  },
  section: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm,
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
  pressed: {
    opacity: 0.6,
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
