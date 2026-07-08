import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BottomSheet,
  Button,
  Card,
  InlineNotice,
  PressableScale,
  Screen,
  Skeleton,
} from '../../components/ui';
import { PdfViewer, type PdfAnnotationOverlay } from '../../components/PdfViewer';
import {
  facultyApi,
  type FacultyAnnotation,
  type FacultyApprover,
  type FacultyReviewDetail,
} from '../../api/faculty';
import { RootStackParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { formatDate } from '../../utils/format';

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
  const [annotations, setAnnotations] = useState<FacultyAnnotation[] | null>(null);
  const [annotationsError, setAnnotationsError] = useState<string | null>(null);

  // Review-action state
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
        setAnnotationsError(null);
        const data = await facultyApi.getAnnotations(paperId);
        if (active) setAnnotations(data);
      } catch (err) {
        if (active) {
          setAnnotationsError(
            err instanceof Error ? err.message : 'Unable to load reviewer annotations.',
          );
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [paperId]);

  const closeSheet = useCallback(() => {
    if (acting) return;
    setSheet(null);
    setActionError(null);
  }, [acting]);

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
    setSheet('approve');
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
    setSheet(kind);
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
      navigation.goBack();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to approve the paper.');
    } finally {
      setActing(false);
    }
  }, [approvers, selectedApproverId, comments, paperId, navigation]);

  const runRevision = useCallback(async () => {
    if (!notes.trim()) {
      setActionError('Revision notes are required.');
      return;
    }
    setActing(true);
    setActionError(null);
    try {
      await facultyApi.requestRevision(paperId, notes.trim());
      navigation.goBack();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to request revision.');
    } finally {
      setActing(false);
    }
  }, [notes, paperId, navigation]);

  const runReject = useCallback(async () => {
    if (!reason.trim()) {
      setActionError('A rejection reason is required.');
      return;
    }
    setActing(true);
    setActionError(null);
    try {
      await facultyApi.rejectPaper(paperId, reason.trim());
      navigation.goBack();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to reject the paper.');
    } finally {
      setActing(false);
    }
  }, [reason, paperId, navigation]);

  if (error && !detail) {
    // `centered` carries no padding keys, so it's safe to pass straight to
    // Screen's own `style` prop without colliding with its inset padding.
    return (
      <Screen edges={{ top: false }} style={styles.centered}>
        <InlineNotice tone="danger" message={error} />
      </Screen>
    );
  }

  if (!detail) {
    // `content` sets its own paddingBottom, so it goes on a plain inner View
    // (not Screen's `style` prop) to avoid overriding Screen's own bottom
    // inset padding — the two stack additively this way.
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
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
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
            <PdfViewer uri={fileUri} annotations={overlays} />
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
              {detail.workflow.map((entry) => (
                <Card key={entry.id} padding="md">
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
              {pagelessAnnotations.map((ann) => {
                const replies = getReplies(ann.id);
                return (
                  <Card key={ann.id} padding="md">
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
                );
              })}
            </View>
          )}
        </View>

        {canReview ? (
          <View style={styles.actions}>
            <Text style={styles.sectionTitle}>Your decision</Text>
            <Button label="Approve" variant="primary" onPress={openApprove} />
            <Button
              label="Request Revision"
              variant="secondary"
              onPress={() => openSheet('revision')}
            />
            <Button label="Reject" variant="subtle" onPress={() => openSheet('reject')} />
          </View>
        ) : null}
      </ScrollView>
      </Screen>

      <BottomSheet visible={sheet !== null} onClose={closeSheet}>
        {sheet === 'approve' ? (
          <>
            <Text style={styles.sheetTitle}>Approve &amp; forward</Text>
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

            <TextInput
              value={comments}
              onChangeText={setComments}
              placeholder="Optional note to the next reviewer"
              placeholderTextColor={theme.colors.text.muted}
              style={[styles.input, styles.textarea]}
              multiline
              editable={!acting}
            />

            {actionError ? <InlineNotice tone="danger" message={actionError} /> : null}

            <View style={styles.sheetButtons}>
              <Button label="Cancel" variant="subtle" onPress={closeSheet} disabled={acting} />
              <Button
                label="Approve"
                variant="primary"
                onPress={runApprove}
                loading={acting}
                disabled={acting || !selectedApproverId}
              />
            </View>
          </>
        ) : null}

        {sheet === 'revision' ? (
          <>
            <Text style={styles.sheetTitle}>Request revision</Text>
            <Text style={styles.sheetHint}>
              Tell the student what needs to change. They will see these notes.
            </Text>

            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Revision notes (required)"
              placeholderTextColor={theme.colors.text.muted}
              style={[styles.input, styles.textarea]}
              multiline
              editable={!acting}
            />

            {actionError ? <InlineNotice tone="danger" message={actionError} /> : null}

            <View style={styles.sheetButtons}>
              <Button label="Cancel" variant="subtle" onPress={closeSheet} disabled={acting} />
              <Button
                label="Send back"
                variant="primary"
                onPress={runRevision}
                loading={acting}
                disabled={acting || !notes.trim()}
              />
            </View>
          </>
        ) : null}

        {sheet === 'reject' ? (
          <>
            <Text style={styles.sheetTitle}>Reject paper</Text>
            <Text style={styles.sheetHint}>Provide a reason. The author will see it.</Text>

            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Rejection reason (required)"
              placeholderTextColor={theme.colors.text.muted}
              style={[styles.input, styles.textarea]}
              multiline
              editable={!acting}
            />

            {actionError ? <InlineNotice tone="danger" message={actionError} /> : null}

            <View style={styles.sheetButtons}>
              <Button label="Cancel" variant="subtle" onPress={closeSheet} disabled={acting} />
              <Button
                label="Reject"
                variant="primary"
                onPress={runReject}
                loading={acting}
                disabled={acting || !reason.trim()}
              />
            </View>
          </>
        ) : null}
      </BottomSheet>
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
    gap: theme.spacing.md,
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
  sheetTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
  },
  sheetHint: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.muted,
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.surface.base,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
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
});
