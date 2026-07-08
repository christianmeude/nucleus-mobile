import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  InlineNotice,
  PressableScale,
  Screen,
  SheetPresenter,
  Skeleton,
} from '../../components/ui';
import { PdfViewer } from '../../components/PdfViewer';
import { facultyApi, type FacultyReviewDetail } from '../../api/faculty';
import { RootStackParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

type FacultyPaperDetailRoute = RouteProp<RootStackParamList, 'FacultyPaperDetail'>;

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Read-only Repository detail — distinct from FacultyReviewDetailScreen, which is
 * built for the assigned-review workflow (decision actions, annotations). This screen
 * is for browsing already-published papers: metadata + PDF, no review chrome.
 */
export const FacultyPaperDetailScreen = () => {
  const route = useRoute<FacultyPaperDetailRoute>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { paperId } = route.params;
  const [detail, setDetail] = useState<FacultyReviewDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);

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
          <Skeleton height={460} radius="lg" />
        </View>
      </Screen>
    );
  }

  return (
    <SheetPresenter
      open={pdfOpen}
      onClose={() => setPdfOpen(false)}
      sheetAccessibilityLabel={`Full paper: ${detail.title}`}
      sheet={fileUri ? <PdfViewer uri={fileUri} variant="fill" /> : null}
    >
      <Screen edges={{ top: false }}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{detail.title}</Text>
        <Text style={styles.meta}>
          {detail.authorName}
          {detail.department ? ` · ${detail.department}` : ''} ·{' '}
          {formatDate(detail.submissionDate || detail.createdAt)}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paper</Text>
          {fileError ? (
            <InlineNotice tone="danger" message={fileError} />
          ) : (
            <PressableScale
              style={styles.viewPaperBtn}
              onPress={() => setPdfOpen(true)}
              disabled={!fileUri}
              accessibilityRole="button"
              accessibilityLabel="View full paper"
              accessibilityState={{ disabled: !fileUri }}
            >
              <View style={styles.viewPaperIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={theme.colors.text.onBrand}
                />
              </View>
              <View style={styles.viewPaperText}>
                <Text style={styles.viewPaperTitle}>View Full Paper</Text>
                <Text style={styles.viewPaperSub}>{fileUri ? 'Open the PDF' : 'Preparing…'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
            </PressableScale>
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
      </ScrollView>
      </Screen>
    </SheetPresenter>
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
  viewPaperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.lg,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.subtle,
  },
  viewPaperIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand.primary,
  },
  viewPaperText: {
    flex: 1,
    gap: 2,
  },
  viewPaperTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text.primary,
  },
  viewPaperSub: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
  },
});
