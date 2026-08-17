import { Icon } from '../../components/ui/Icon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { PaperAnnotation } from '../../api/research';
import { facultyApi, type FacultyApprover, type FacultyReviewDetail } from '../../api/faculty';
import { RootStackParamList } from '../../navigation/types';

import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { formatDate } from '../../utils/format';
import { CircleX, Pencil, CircleCheck } from 'lucide-react-native';


type FacultyDetailRoute = RouteProp<RootStackParamList, 'FacultyReviewDetail'>;
type FacultyNavigation = NativeStackNavigationProp<RootStackParamList>;
type SheetKind = 'approve' | 'revision' | 'reject';

function titleCase(value?: string | null, fallback = ''): string {
  if (!value) return fallback;
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export const FacultyReviewDetailScreen = () => {
  const route = useRoute<FacultyDetailRoute>();
  const navigation = useNavigation<FacultyNavigation>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { paperId } = route.params;
  const [detail, setDetail] = useState<FacultyReviewDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<PaperAnnotation[] | null>(null);
  const [annotationsError, setAnnotationsError] = useState<string | null>(null);
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

  const handleCreateHighlight = useCallback(
    async (input: {
      pageNumber: number;
      highlightRects: { x: number; y: number; w: number; h: number }[];
      note: string;
    }) => {
      await facultyApi.createHighlightAnnotation({ paperId, ...input });
      await loadAnnotations();
    },
    [paperId, loadAnnotations],
  );

  const handleCreateDraw = useCallback(
    async (input: {
      pageNumber: number;
      imageDataUrl: string;
    }) => {
      await facultyApi.createDrawAnnotation({ paperId, ...input });
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
          <Text style={styles.title}>{detail.title}</Text>
          <Text style={styles.meta}>
            {detail.authorName}
            {detail.department ? ` · ${detail.department}` : ''} ·{' '}
            {formatDate(detail.submissionDate || detail.createdAt)}
          </Text>

          {detail.revisionNotes ? (
            <InlineNotice tone="warning" message={`Revision notes: ${detail.revisionNotes}`} />
          ) : null}
          {detail.rejectionReason ? (
            <InlineNotice tone="danger" message={`Rejection reason: ${detail.rejectionReason}`} />
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paper</Text>
            {fileError ? (
              <InlineNotice tone="danger" message={fileError} />
            ) : fileUri ? (
              <PdfViewer
                ref={pdfRef}
                uri={fileUri}
                annotations={overlays}
                canAnnotate={canReview}
                onCreateNote={handleCreateNote}
                onCreateHighlight={handleCreateHighlight}
                onCreateDraw={handleCreateDraw}
                onAnnotationPress={(id) => {
                  setSelectedAnnotationId(id);
                  setPanelOpen(true);
                }}
              />
            ) : (
              <Skeleton height={460} radius="lg" />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Abstract</Text>
            <Text style={styles.body}>{detail.abstract || '—'}</Text>
          </View>

          {detail.keywords && detail.keywords.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Keywords</Text>
              <Text style={styles.body}>{detail.keywords.join(', ')}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Review history</Text>
            {detail.workflow.length === 0 ? (
              <Text style={styles.muted}>No review activity yet.</Text>
            ) : (
              <View style={styles.timeline}>
                {detail.workflow.map((entry, index) => (
                  <ListEntranceItem key={entry.id} index={index}>
                    <Card padding="md">
                      <Text style={styles.timelineHead}>
                        {titleCase(entry.reviewerRole, 'Reviewer')}
                        {entry.actionType ? ` · ${titleCase(entry.actionType)}` : ''}
                      </Text>
                      <Text style={styles.muted}>
                        {entry.reviewerName ? `${entry.reviewerName} · ` : ''}
                        {formatDate(entry.reviewedAt || entry.createdAt)}
                      </Text>
                      {entry.comments ? <Text style={styles.body}>{entry.comments}</Text> : null}
                    </Card>
                  </ListEntranceItem>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reviewer comments</Text>
            {annotationsError ? (
              <InlineNotice tone="danger" message={annotationsError} />
            ) : annotations === null ? (
              <Skeleton height={80} radius="md" />
            ) : pagelessAnnotations.length === 0 ? (
              <Text style={styles.muted}>No general reviewer comments.</Text>
            ) : (
              <View style={styles.timeline}>
                {pagelessAnnotations.map((ann, index) => {
                  const replies = getReplies(ann.id);
                  return (
                    <ListEntranceItem key={ann.id} index={index}>
                      <Card padding="md">
                        <Text style={styles.timelineHead}>{ann.reviewerName}</Text>
                        <Text style={styles.muted}>
                          {ann.reviewerRole ? `${titleCase(ann.reviewerRole)} · ` : ''}
                          {formatDate(ann.createdAt)}
                        </Text>
                        {ann.note ? <Text style={styles.body}>{ann.note}</Text> : null}
                        {replies.map((reply) => (
                          <View key={reply.id} style={styles.annotationReply}>
                            <Text style={styles.timelineHead}>{reply.reviewerName}</Text>
                            <Text style={styles.muted}>{formatDate(reply.createdAt)}</Text>
                            {reply.note ? <Text style={styles.body}>{reply.note}</Text> : null}
                          </View>
                        ))}
                      </Card>
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
                  <Button label="Reject" variant="danger" icon={<Icon icon={CircleX} size={18} color={theme.colors.text.onBrand} />} onPress={() => openSheet('reject')} />
                </View>
                <View style={styles.decisionButtonWrapper}>
                  <Button
                    label="Revision"
                    variant="accent"
                    icon={<Icon icon={Pencil} size={18} color={theme.colors.text.onBrand} />}
                    onPress={() => openSheet('revision')}
                  />
                </View>
                <View style={styles.decisionButtonWrapper}>
                  <Button label="Approve" variant="success" icon={<Icon icon={CircleCheck} size={18} color={theme.colors.text.onBrand} />} onPress={openApprove} />
                </View>
              </View>
            </View>
          ) : null}
        </Animated.ScrollView>
      </Screen>

      <BottomSheet ref={actionSheetRef} onDismiss={() => setSheet(null)}>
        {sheet === 'approve' ? (
          <>
            <View style={[styles.sheetHeader, { backgroundColor: theme.colors.state.successSurface }]}>
              <Icon icon={CircleCheck} size={24} color={theme.colors.state.success} />
              <Text style={[styles.sheetTitle, { color: theme.colors.brand.primary }]}>Approve &amp; forward</Text>
            </View>

            {confirmStep ? (
              <Card padding="md" style={styles.confirmCard}>
                <Text style={styles.confirmAction}>Approve &amp; forward to {approvers?.find(a => a.id === selectedApproverId)?.name}</Text>
                <Text style={styles.confirmPaper}>{detail?.title}</Text>
                <Text style={styles.confirmAuthor}>by {detail?.authorName}</Text>
                <View style={styles.sheetButtons}>
                  <Button label="Cancel" variant="subtle" onPress={() => setConfirmStep(false)} disabled={acting} />
                  <Button label="Confirm" variant="primary" onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    runApprove();
                  }} loading={acting} disabled={acting} />
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
            <View style={[styles.sheetHeader, { backgroundColor: theme.colors.brand.accentSurface }]}>
              <Icon icon={Pencil} size={24} color={theme.colors.brand.accent} />
              <Text style={[styles.sheetTitle, { color: theme.colors.brand.accent }]}>Request revision</Text>
            </View>

            {confirmStep ? (
              <Card padding="md" style={styles.confirmCard}>
                <Text style={[styles.confirmAction, { color: theme.colors.brand.accent }]}>Request Revision</Text>
                <Text style={styles.confirmPaper}>{detail?.title}</Text>
                <Text style={styles.confirmAuthor}>by {detail?.authorName}</Text>
                <View style={styles.sheetButtons}>
                  <Button label="Cancel" variant="subtle" onPress={() => setConfirmStep(false)} disabled={acting} />
                  <Button label="Confirm" variant="accent" onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    runRevision();
                  }} loading={acting} disabled={acting} />
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
                    focusColor={theme.colors.brand.accent}
                  />
                  <Text style={styles.charCount}>{notes.length} / 1000</Text>
                </View>

                {actionError ? <InlineNotice tone="danger" message={actionError} /> : null}

                <View style={styles.sheetButtons}>
                  <Button label="Cancel" variant="subtle" onPress={closeSheet} disabled={acting} />
                  <Button
                    label="Send back"
                    variant="accent"
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
            <View style={[styles.sheetHeader, { backgroundColor: theme.colors.state.dangerSurface }]}>
              <Icon icon={CircleX} size={24} color={theme.colors.state.danger} />
              <Text style={[styles.sheetTitle, { color: theme.colors.state.danger }]}>Reject paper</Text>
            </View>

            {confirmStep ? (
              <Card padding="md" style={styles.confirmCard}>
                <Text style={[styles.confirmAction, { color: theme.colors.state.danger }]}>Reject Paper</Text>
                <Text style={styles.confirmPaper}>{detail?.title}</Text>
                <Text style={styles.confirmAuthor}>by {detail?.authorName}</Text>
                <View style={styles.sheetButtons}>
                  <Button label="Cancel" variant="subtle" onPress={() => setConfirmStep(false)} disabled={acting} />
                  <Button label="Confirm" variant="danger" onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    runReject();
                  }} loading={acting} disabled={acting} />
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

      {annotations && (
        <AnnotationPanel
          annotations={annotations as PaperAnnotation[]}
          visible={panelOpen}
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
          <Animated.View entering={ZoomIn.springify().damping(12).stiffness(200)} style={styles.successIcon}>
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
    title: {
      fontFamily: theme.fontFamilies.display.semibold,
      fontSize: 26,
      lineHeight: 32,
      color: theme.colors.text.primary,
    },
    meta: {
      ...theme.typography.metadata,
      color: theme.colors.text.muted,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.h3,
      color: theme.colors.text.primary,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
    muted: {
      ...theme.typography.bodySmall,
      color: theme.colors.text.muted,
    },
    timeline: {
      gap: theme.spacing.sm,
    },
    annotationReply: {
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border.subtle,
      gap: theme.spacing.xs,
    },
    timelineHead: {
      ...theme.typography.bodyStrong,
      color: theme.colors.text.primary,
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
