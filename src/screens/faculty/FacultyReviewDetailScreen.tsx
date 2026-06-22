import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Button, Card, Chip, InlineNotice, Skeleton } from '../../components/ui';
import { facultyApi, type FacultyReviewDetail } from '../../api/faculty';
import { facultyStatusLabel, facultyStatusTone } from './facultyStatus';
import { RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

type FacultyDetailRoute = RouteProp<RootStackParamList, 'FacultyReviewDetail'>;

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function titleCase(value?: string | null, fallback = ''): string {
  if (!value) return fallback;
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export const FacultyReviewDetailScreen = () => {
  const route = useRoute<FacultyDetailRoute>();
  const { paperId } = route.params;
  const [detail, setDetail] = useState<FacultyReviewDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openingFile, setOpeningFile] = useState(false);

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

  const openPdf = useCallback(async () => {
    setOpeningFile(true);
    try {
      const file = await facultyApi.getReviewFile(paperId);
      const canOpen = await Linking.canOpenURL(file.fileUrl);
      if (!canOpen) {
        throw new Error('No app is available to open this file.');
      }
      await Linking.openURL(file.fileUrl);
    } catch (err) {
      Alert.alert('Unable to open PDF', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setOpeningFile(false);
    }
  }, [paperId]);

  if (error && !detail) {
    return (
      <View style={styles.centered}>
        <InlineNotice tone="danger" message={error} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.content}>
        <Skeleton height={28} width="80%" />
        <Skeleton height={16} width="50%" />
        <Skeleton height={120} radius="lg" />
        <Skeleton height={90} radius="lg" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.badgeRow}>
        <Chip
          label={facultyStatusLabel(detail.status)}
          variant="status"
          tone={facultyStatusTone(detail.status)}
        />
      </View>

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

      <Button
        label="Open PDF"
        variant="secondary"
        onPress={openPdf}
        loading={openingFile}
        accessibilityLabel="Open the paper PDF"
      />

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

      <InlineNotice
        tone="info"
        message="Review decisions (approve, request revision, reject) are coming to mobile in a later update."
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.surface.base,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface.base,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  title: {
    ...theme.typography.h1,
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
  timelineHead: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text.primary,
  },
});
