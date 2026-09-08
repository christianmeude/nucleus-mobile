import { Icon } from '../../components/ui/Icon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn, SlideOutLeft, FadeOut } from 'react-native-reanimated';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  BottomSheet,
  Button,
  Card,
  InlineNotice,
  Input,
  PressableScale,
  Screen,
  Skeleton,
  BottomSheetTextInput,
} from '../../components/ui';
import {
  PdfViewer,
  type PdfAnnotationOverlay,
  type PdfViewerRef,
} from '../../components/PdfViewer';
import { AnnotationPanel } from '../../components/AnnotationPanel';
import { ListEntranceItem } from '../../components/ListEntranceItem';
import { PublishedBadge } from '../../components/ui/PublishedBadge';
import { PaperAnnotation, researchApi } from '../../api/research';
import type { Category } from '../../types/domain';
import { facultyApi, type FacultyApprover, type FacultyReviewDetail } from '../../api/faculty';
import { RootStackParamList } from '../../navigation/types';

import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import {
  formatDate,
  formatRole,
  splitAnnotationSummary,
  statusToLabel,
} from '../../utils/format';
import { buildCategoryNameById, resolveCategoryName } from '../../utils/category';
import { CircleX, Pencil, CircleCheck, ShieldCheck, ArrowUpRight } from 'lucide-react-native';

type FacultyDetailRoute = RouteProp<RootStackParamList, 'FacultyReviewDetail'>;
type FacultyNavigation = NativeStackNavigationProp<RootStackParamList>;
type SheetKind = 'approve' | 'revision' | 'reject';

export const FacultyReviewDetailScreen = () => {
  const route = useRoute<FacultyDetailRoute>();
  const navigation = useNavigation<FacultyNavigation>();
  const { theme, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { paperId } = route.params;
  const [detail, setDetail] = useState<FacultyReviewDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<PaperAnnotation[] | null>(null);
  const [annotationsError, setAnnotationsError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const pdfRef = useRef<PdfViewerRef>(null);

  // Review-action state
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const actionSheetRef = useRef<BottomSheetModal>(null);

  const onSuccess = useCallback(() => {
    actionSheetRef.current?.dismiss();
    setSheet(null);
    setShowSuccess(true);
    setTimeout(() => {
      navigation.goBack();
    }, 1200);
  }, [navigation]);

  // Approve inputs
  const [approvers, setApprovers] = useState<FacultyApprover[] | null>(null);
  const [approversError, setApproversError] = useState<string | null>(null);
  const [selectedApproverId, setSelectedApproverId] = useState<string | null>(null);
  const [comments, setComments] = useState('');

  // Revision / reject inputs
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setError(null);
        const data = await facultyApi.getReviewDetail(paperId);
        if (active) setDetail(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load the paper.');
      }
    })();
    return () => {
      active = false;
    };
  }, [paperId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setFileError(null);
        const file = await facultyApi.getReviewFile(paperId);
        if (active) setFileUri(file.fileUrl);
      } catch (err) {
        if (active) {
          setFileError(err instanceof Error ? err.message : 'Unable to load the paper file.');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [paperId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await researchApi.getCategories();
        if (active) setCategories(rows);
      } catch {
        // Category eyebrow is decorative; the detail works without it.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const loadAnnotations = useCallback(async () => {
    try {
      const data = await facultyApi.getAnnotations(paperId);
      setAnnotations(data);
      setAnnotationsError(null);
    } catch (err) {
      setAnnotationsError(
        err instanceof Error ? err.message : 'Unable to load reviewer annotations.',
      );
    }
  }, [paperId]);

  useEffect(() => {
    void (async () => {
      await loadAnnotations();
    })();
  }, [loadAnnotations]);

  const handleCreateNote = useCallback(
    async (input: {
      pageNumber: number;
      anchorPercent: { x: number; y: number };
      note: string;
    }) => {
      await facultyApi.createNoteAnnotation({ paperId, ...input });
      await loadAnnotations();
    },
    [paperId, loadAnnotations],
  );

  const closeSheet = useCallback(() => {
    actionSheetRef.current?.dismiss();
    setTimeout(() => {
      setSheet(null);
      setActionError(null);
      setConfirmStep(false);
    }, 200);
  }, []);

  const overlays = useMemo<PdfAnnotationOverlay[] | undefined>(
    () =>
      annotations?.map((ann) => ({
        id: ann.id,
        pageNumber: ann.pageNumber,
        annotationType: ann.annotationType,
        highlightColor: ann.highlightColor,
        highlightRects: ann.highlightRects,
        anchorPercent: ann.anchorPercent,
        drawImageUrl: ann.drawImageUrl,
      })),
    [annotations],
  );

  const pagelessAnnotations = useMemo(
    () => (annotations ?? []).filter((a) => a.pageNumber === null && a.parentId === null),
    [annotations],
  );

  const getReplies = useCallback(
    (parentId: string) => (annotations ?? []).filter((a) => a.parentId === parentId),
    [annotations],
  );

  const openApprove = useCallback(async () => {
    setActionError(null);
    setConfirmStep(false);
    setSheet('approve');
    actionSheetRef.current?.present();
    if (approvers === null) {
      try {
        setApproversError(null);
        setApprovers(await facultyApi.getDeanChairMembers());
      } catch (err) {
        setApproversError(err instanceof Error ? err.message : 'Unable to load reviewers.');
      }
    }
  }, [approvers]);

  const openSheet = useCallback((kind: SheetKind) => {
    setActionError(null);
    setConfirmStep(false);
    setSheet(kind);
    actionSheetRef.current?.present();
  }, []);

  const runApprove = useCallback(async () => {
    const target = approvers?.find((entry) => entry.id === selectedApproverId);
    if (!target) {
      setActionError('Select a dean or program chair to forward to.');
      return;
    }
    setActing(true);
    setActionError(null);
    try {
      await facultyApi.approvePaper(paperId, target.id, target.role, comments);
      onSuccess();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to approve the paper.');
    } finally {
      setActing(false);
    }
  }, [approvers, selectedApproverId, comments, paperId, onSuccess]);

  const runRevision = useCallback(async () => {
    if (!notes.trim()) {
      setActionError('Revision notes are required.');
      return;
    }
    setActing(true);
    setActionError(null);
    try {
      await facultyApi.requestRevision(paperId, notes.trim());
      onSuccess();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to request revision.');
    } finally {
      setActing(false);
    }
  }, [notes, paperId, onSuccess]);

  const runReject = useCallback(async () => {
    if (!reason.trim()) {
      setActionError('A rejection reason is required.');
      return;
    }
    setActing(true);
    setActionError(null);
    try {
      await facultyApi.rejectPaper(paperId, reason.trim());
      onSuccess();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to reject the paper.');
    } finally {
      setActing(false);
    }
  }, [reason, paperId, onSuccess]);

  if (error && !detail) {
    return (
      <Screen edges={{ top: false }} style={styles.centered}>
        <InlineNotice tone="danger" message={error} />
      </Screen>
    );
  }

  if (!detail) {
    return (
      <Screen edges={{ top: false }}>
        <View style={styles.content}>
          <Skeleton height={28} width="80%" />
          <Skeleton height={16} width="50%" />
          <Skeleton height={120} radius="lg" />
          <Skeleton height={90} radius="lg" />
        </View>
      </Screen>
    );
  }

  const canReview = detail.status === 'pending_faculty';

  // Shared header content mirrors ResearchDetail exactly (same order, copy,
  // and formatting) so both roles see the same view. Plain computation (not a
  // hook) because this sits below the loading early-returns.
  const categoryNameById = buildCategoryNameById(categories);
  const categoryName = detail ? resolveCategoryName(detail.category, categoryNameById) : '';
  const authorsLine = detail
    ? [detail.authorName, ...(detail.coAuthorNames ?? [])].join('  ·  ')
    : '';
  const affiliation = detail
    ? [detail.programName, detail.department].filter(Boolean).join(' · ')
    : '';
  const displayDate = detail
    ? detail.publishedDate || detail.submissionDate || detail.createdAt
    : null;

  return (
    <>
      <Screen edges={{ top: false }}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          entering={FadeIn.duration(320)}
          style={styles.screen}
          contentContainerStyle={styles.content}
        >
          {categoryName ? <Text style={styles.eyebrow}>{categoryName}</Text> : null}
          {detail.status === 'published' ? (
            <View style={{ marginBottom: 6 }}>
              <PublishedBadge />
            </View>
          ) : null}
          <Text style={styles.title}>{detail.title}</Text>
          <Text style={styles.authors}>{authorsLine}</Text>
          {affiliation ? <Text style={styles.affiliation}>{affiliation}</Text> : null}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{formatDate(displayDate)}</Text>
            <Text style={styles.metaSep}>·</Text>
            <Text style={styles.metaText}>{detail.viewCount || 0} views</Text>
          </View>
          {detail.status === 'published' && detail.doi ? (
            <View style={styles.doiCard}>
              <View style={styles.doiHeader}>
                <Icon icon={ShieldCheck} size={16} color={theme.colors.brand.accent} />
                <Text style={styles.doiTitle}>Formal Publication (DOI)</Text>
              </View>
              <PressableScale
                style={styles.doiLinkRow}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Linking.openURL(`https://doi.org/${detail.doi}`).catch(() => undefined);
                }}
                accessibilityRole="link"
                accessibilityLabel={`Open DOI https://doi.org/${detail.doi} in browser`}
              >
                <Text style={styles.doiLink} numberOfLines={1}>
                  https://doi.org/{detail.doi}
                </Text>
                <Icon icon={ArrowUpRight} size={14} color={theme.colors.brand.primary} />
              </PressableScale>
            </View>
          ) : null}

          {detail.revisionNotes ? (
            <InlineNotice tone="warning" message={`Revision notes: ${detail.revisionNotes}`} />
          ) : null}
          {detail.rejectionReason ? (
            <InlineNotice tone="danger" message={`Rejection reason: ${detail.rejectionReason}`} />
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Paper</Text>
            {fileError ? (
              <InlineNotice tone="danger" message={fileError} />
            ) : fileUri ? (
              <PdfViewer
                ref={pdfRef}
                uri={fileUri}
                annotations={overlays}
                canAnnotate={canReview}
                onCreateNote={handleCreateNote}
                onAnnotationPress={(id) => {
                  setSelectedAnnotationId(id);
                  setPanelOpen(true);
                }}
              />
            ) : (
              <Skeleton height={460} radius="lg" />
            )}
          </View>

          {detail.keywords && detail.keywords.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Keywords</Text>
              <View style={styles.keywordsWrap}>
                {detail.keywords.map((keyword) => (
                  <View key={keyword} style={styles.keywordTag}>
                    <Text style={styles.keywordText}>{keyword}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Abstract</Text>
            <Text style={styles.abstract}>{detail.abstract || 'No abstract available.'}</Text>
          </View>

          <View
            style={styles.section}
            accessible
            accessibilityLabel={`Review progress, ${statusToLabel(detail.status) || detail.status}`}
          >
            <Text style={styles.sectionLabel}>Review progress</Text>
            {detail.workflow.length === 0 ? (
              <Text style={styles.workflowEmpty}>No review activity yet.</Text>
            ) : (
              <View style={styles.workflowList}>
                {detail.workflow.map((entry, index) => {
                  const isCurrent = index === 0;
                  const isLast = index === detail.workflow.length - 1;
                  const isTerminal =
                    entry.status === 'approved' || entry.status === 'published';
                  const dateValue = formatDate(entry.reviewedAt || entry.createdAt);
                  const roleLabel = formatRole(entry.reviewerRole);
                  const metaLine = roleLabel ? `${roleLabel} · ${dateValue}` : dateValue;
                  const commentParts = splitAnnotationSummary(entry.comments);
                  return (
                    <ListEntranceItem key={entry.id} index={index}>
                      <View style={styles.workflowRow}>
                        <View style={styles.workflowRail}>
                          <View
                            style={[
                              styles.workflowDot,
                              isCurrent
                                ? styles.workflowDotCurrent
                                : isTerminal
                                  ? styles.workflowDotTerminal
                                  : styles.workflowDotPast,
                            ]}
                          />
                          {!isLast ? <View style={styles.workflowConnector} /> : null}
                        </View>
                        <View style={styles.workflowBody}>
                          <Text style={styles.workflowName}>
                            {statusToLabel(entry.status) || 'Status updated'}
                          </Text>
                          {metaLine ? (
                            <Text style={styles.workflowMeta}>{metaLine}</Text>
                          ) : null}
                          {commentParts.main ? (
                            <Text style={styles.workflowComment}>{commentParts.main}</Text>
                          ) : null}
                          {commentParts.summary.length > 0 ? (
                            <View style={styles.workflowSummary}>
                              <Text style={styles.workflowSummaryLabel}>
                                Annotation Summary
                              </Text>
                              {commentParts.summary.map((line, lineIndex) => (
                                <Text
                                  key={`${entry.id}-summary-${lineIndex}`}
                                  style={styles.workflowSummaryItem}
                                >
                                  {lineIndex + 1}. {line}
                                </Text>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </ListEntranceItem>
                  );
                })}
              </View>
            )}
          </View>

          {canReview ? (
            <View style={styles.actions}>
              <Text style={styles.sectionTitle}>Your decision</Text>
              <View style={styles.decisionRow}>
                <View style={styles.decisionButtonWrapper}>
                  <Button
                    label="Reject"
                    variant="danger"
                    icon={<Icon icon={CircleX} size={18} color={theme.colors.state.danger} />}
                    onPress={() => openSheet('reject')}
                  />
                </View>
                <View style={styles.decisionButtonWrapper}>
                  <Button
                    label="Revision"
                    variant="warning"
                    icon={<Icon icon={Pencil} size={18} color={theme.colors.state.warning} />}
                    onPress={() => openSheet('revision')}
                  />
                </View>
                <View style={styles.decisionButtonWrapper}>
                  <Button
                    label="Approve"
                    variant="success"
                    icon={<Icon icon={CircleCheck} size={18} color={theme.colors.state.success} />}
                    onPress={openApprove}
                  />
                </View>
              </View>
            </View>
          ) : null}
        </Animated.ScrollView>
      </Screen>

      <BottomSheet
        ref={actionSheetRef}
        onDismiss={() => setSheet(null)}
        snapPoints={['65%', '92%']}
      >
        {sheet === 'approve' ? (
          <>
            <View
              style={[styles.sheetHeader, { backgroundColor: theme.colors.state.successSurface }]}
            >
              <Icon icon={CircleCheck} size={24} color={theme.colors.state.success} />
              <Text style={[styles.sheetTitle, { color: theme.colors.brand.primary }]}>
                Approve &amp; forward
              </Text>
            </View>

            {confirmStep ? (
              <Card padding="md" style={styles.confirmCard}>
                <Text style={styles.confirmAction}>
                  Approve &amp; forward to{' '}
                  {approvers?.find((a) => a.id === selectedApproverId)?.name}
                </Text>
                <Text style={styles.confirmPaper}>{detail?.title}</Text>
                <Text style={styles.confirmAuthor}>by {detail?.authorName}</Text>
                <View style={styles.sheetButtons}>
                  <Button
                    label="Cancel"
                    variant="subtle"
                    onPress={() => setConfirmStep(false)}
                    disabled={acting}
                  />
                  <Button
                    label="Confirm"
                    variant="primary"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      runApprove();
                    }}
                    loading={acting}
                    disabled={acting}
                  />
                </View>
              </Card>
            ) : (
              <>
                <Text style={styles.sheetHint}>
                  Choose a dean or program chair to receive this paper next.
                </Text>

                {approversError ? <InlineNotice tone="danger" message={approversError} /> : null}

                {approvers === null && !approversError ? (
                  <Skeleton height={56} radius="md" />
                ) : (approvers ?? []).length === 0 ? (
                  <Text style={styles.muted}>No deans or program chairs are available.</Text>
                ) : (
                  <View style={styles.approverList}>
                    {(approvers ?? []).map((approver) => {
                      const selected = approver.id === selectedApproverId;
                      return (
                        <PressableScale
                          key={approver.id}
                          onPress={() => setSelectedApproverId(approver.id)}
                          disabled={acting}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          style={[styles.approver, selected ? styles.approverSelected : null]}
                        >
                          <Text style={styles.approverName}>{approver.name}</Text>
                          <Text style={styles.approverRole}>
                            {approver.role === 'dean' ? 'Dean' : 'Program Chair'}
                            {approver.department ? ` · ${approver.department}` : ''}
                          </Text>
                        </PressableScale>
                      );
                    })}
                  </View>
                )}

                <View>
                  <Input
                    component={BottomSheetTextInput}
                    value={comments}
                    onChangeText={setComments}
                    placeholder="Optional note to the next reviewer"
                    inputStyle={styles.textarea}
                    multiline
                    editable={!acting}
                    maxLength={500}
                    focusColor={theme.colors.state.success}
                  />
                  <Text style={styles.charCount}>{comments.length} / 500</Text>
                </View>

                {actionError ? <InlineNotice tone="danger" message={actionError} /> : null}

                <View style={styles.sheetButtons}>
                  <Button label="Cancel" variant="subtle" onPress={closeSheet} disabled={acting} />
                  <Button
                    label="Approve"
                    variant="success"
                    onPress={() => setConfirmStep(true)}
                    disabled={acting || !selectedApproverId}
                  />
                </View>
              </>
            )}
          </>
        ) : null}

        {sheet === 'revision' ? (
          <>
            <View
              style={[styles.sheetHeader, { backgroundColor: theme.colors.state.warningSurface }]}
            >
              <Icon icon={Pencil} size={24} color={theme.colors.state.warning} />
              <Text style={[styles.sheetTitle, { color: theme.colors.state.warning }]}>
                Request revision
              </Text>
            </View>

            {confirmStep ? (
              <Card padding="md" style={styles.confirmCard}>
                <Text style={[styles.confirmAction, { color: theme.colors.state.warning }]}>
                  Request Revision
                </Text>
                <Text style={styles.confirmPaper}>{detail?.title}</Text>
                <Text style={styles.confirmAuthor}>by {detail?.authorName}</Text>
                <View style={styles.sheetButtons}>
                  <Button
                    label="Cancel"
                    variant="subtle"
                    onPress={() => setConfirmStep(false)}
                    disabled={acting}
                  />
                  <Button
                    label="Confirm"
                    variant="warning"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      runRevision();
                    }}
                    loading={acting}
                    disabled={acting}
                  />
                </View>
              </Card>
            ) : (
              <>
                <Text style={styles.sheetHint}>
                  Tell the student what needs to change. They will see these notes.
                </Text>

                <View>
                  <Input
                    component={BottomSheetTextInput}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Revision notes (required)"
                    inputStyle={styles.textarea}
                    multiline
                    editable={!acting}
                    maxLength={1000}
                    focusColor={theme.colors.state.warning}
                  />
                  <Text style={styles.charCount}>{notes.length} / 1000</Text>
                </View>

                {actionError ? <InlineNotice tone="danger" message={actionError} /> : null}

                <View style={styles.sheetButtons}>
                  <Button label="Cancel" variant="subtle" onPress={closeSheet} disabled={acting} />
                  <Button
                    label="Send back"
                    variant="warning"
                    onPress={() => setConfirmStep(true)}
                    disabled={acting || !notes.trim()}
                  />
                </View>
              </>
            )}
          </>
        ) : null}

        {sheet === 'reject' ? (
          <>
            <View
              style={[styles.sheetHeader, { backgroundColor: theme.colors.state.dangerSurface }]}
            >
              <Icon icon={CircleX} size={24} color={theme.colors.state.danger} />
              <Text style={[styles.sheetTitle, { color: theme.colors.state.danger }]}>
                Reject paper
              </Text>
            </View>

            {confirmStep ? (
              <Card padding="md" style={styles.confirmCard}>
                <Text style={[styles.confirmAction, { color: theme.colors.state.danger }]}>
                  Reject Paper
                </Text>
                <Text style={styles.confirmPaper}>{detail?.title}</Text>
                <Text style={styles.confirmAuthor}>by {detail?.authorName}</Text>
                <View style={styles.sheetButtons}>
                  <Button
                    label="Cancel"
                    variant="subtle"
                    onPress={() => setConfirmStep(false)}
                    disabled={acting}
                  />
                  <Button
                    label="Confirm"
                    variant="danger"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      runReject();
                    }}
                    loading={acting}
                    disabled={acting}
                  />
                </View>
              </Card>
            ) : (
              <>
                <Text style={styles.sheetHint}>Provide a reason. The author will see it.</Text>

                <View>
                  <Input
                    component={BottomSheetTextInput}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Rejection reason (required)"
                    inputStyle={styles.textarea}
                    multiline
                    editable={!acting}
                    maxLength={1000}
                    focusColor={theme.colors.state.danger}
                  />
                  <Text style={styles.charCount}>{reason.length} / 1000</Text>
                </View>

                {actionError ? <InlineNotice tone="danger" message={actionError} /> : null}

                <View style={styles.sheetButtons}>
                  <Button label="Cancel" variant="subtle" onPress={closeSheet} disabled={acting} />
                  <Button
                    label="Reject"
                    variant="danger"
                    onPress={() => setConfirmStep(true)}
                    disabled={acting || !reason.trim()}
                  />
                </View>
              </>
            )}
          </>
        ) : null}
      </BottomSheet>

      {annotations && panelOpen && (
        <AnnotationPanel
          annotations={annotations as PaperAnnotation[]}
          selectedAnnotationId={selectedAnnotationId}
          onClose={() => {
            setPanelOpen(false);
            setSelectedAnnotationId(null);
          }}
          onAnnotationPress={(ann) => {
            setPanelOpen(false);
            if (ann.pageNumber) {
              pdfRef.current?.jumpToPage(ann.pageNumber);
            }
          }}
        />
      )}

      {showSuccess && (
        <View style={styles.successOverlay}>
          <Animated.View
            entering={ZoomIn.springify().damping(12).stiffness(200)}
            style={styles.successIcon}
          >
            <Icon icon={CircleCheck} size={64} color={theme.colors.state.success} />
            <Text style={styles.successText}>Decision Submitted</Text>
          </Animated.View>
        </View>
      )}
    </>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.xl,
      paddingBottom: theme.spacing['3xl'],
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
    },
    // Shared header/sections mirror ResearchDetail exactly (same order, copy,
    // and formatting) so both roles see the same view.
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
    doiCard: {
      marginTop: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border.subtle,
      gap: theme.spacing.sm,
    },
    doiHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    doiTitle: {
      ...theme.typography.label,
      color: theme.colors.text.primary,
    },
    doiLinkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    doiLink: {
      ...theme.typography.caption,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.brand.primary,
      textDecorationLine: 'underline',
      flex: 1,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.h3,
      color: theme.colors.text.primary,
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
      borderCurve: 'continuous',
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
    muted: {
      ...theme.typography.bodySmall,
      color: theme.colors.text.muted,
    },
    workflowList: {
      gap: 0,
    },
    workflowRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    workflowRail: {
      width: 20,
      alignItems: 'center',
      alignSelf: 'stretch',
    },
    workflowDot: {
      width: 10,
      height: 10,
      borderRadius: theme.radii.pill,
      borderCurve: 'continuous',
      marginTop: 5,
    },
    workflowDotCurrent: {
      backgroundColor: theme.colors.brand.primary,
      borderWidth: 2,
      borderColor: theme.colors.brand.accent,
      width: 14,
      height: 14,
      marginTop: 3,
    },
    workflowDotPast: {
      backgroundColor: theme.colors.border.strong,
    },
    workflowDotTerminal: {
      backgroundColor: theme.colors.state.success,
    },
    workflowConnector: {
      flex: 1,
      width: 2,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.border.subtle,
      marginTop: theme.spacing.xs,
      marginBottom: -theme.spacing.md,
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
    workflowEmpty: {
      ...theme.typography.bodySmall,
      color: theme.colors.text.muted,
    },
    workflowSummary: {
      marginTop: theme.spacing.xs,
      paddingLeft: theme.spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.border.subtle,
      gap: 2,
    },
    workflowSummaryLabel: {
      ...theme.typography.label,
      color: theme.colors.text.muted,
    },
    workflowSummaryItem: {
      ...theme.typography.bodySmall,
      color: theme.colors.text.secondary,
    },
    annotationReply: {
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border.subtle,
      gap: theme.spacing.xs,
    },
    actions: {
      gap: theme.spacing.sm,
    },
    decisionRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    decisionButtonWrapper: {
      flex: 1,
    },
    sheetTitle: {
      ...theme.typography.h3,
      color: theme.colors.text.primary,
    },
    sheetHint: {
      ...theme.typography.bodySmall,
      color: theme.colors.text.muted,
    },
    // input style removed as it is now handled by the Input component
    textarea: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
    approverList: {
      gap: theme.spacing.sm,
    },
    approver: {
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      borderRadius: theme.radii.md,
      borderCurve: 'continuous',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surface.base,
    },
    approverSelected: {
      borderColor: theme.colors.brand.primary,
      backgroundColor: theme.colors.brand.primarySoft,
    },
    approverName: {
      ...theme.typography.bodyStrong,
      color: theme.colors.text.primary,
    },
    approverRole: {
      ...theme.typography.bodySmall,
      color: theme.colors.text.muted,
    },
    sheetButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: theme.spacing.sm,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginHorizontal: -theme.spacing.lg,
      marginTop: 0,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      marginBottom: theme.spacing.sm,
    },
    charCount: {
      ...theme.typography.caption,
      color: theme.colors.text.muted,
      textAlign: 'right',
      marginTop: theme.spacing.xs,
    },
    confirmCard: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    confirmAction: {
      ...theme.typography.h3,
      color: theme.colors.text.primary,
    },
    confirmPaper: {
      ...theme.typography.bodyStrong,
      color: theme.colors.text.secondary,
    },
    confirmAuthor: {
      ...theme.typography.bodySmall,
      color: theme.colors.text.muted,
    },
    successOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.surface.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
    },
    successIcon: {
      backgroundColor: theme.colors.surface.raised,
      padding: theme.spacing.xl,
      borderRadius: 24,
      alignItems: 'center',
      gap: theme.spacing.md,
      ...theme.shadows.level2,
    },
    successText: {
      ...theme.typography.h3,
      color: theme.colors.text.primary,
    },
  });
