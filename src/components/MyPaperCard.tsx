import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PaperStatus, ResearchPaper } from '../types/domain';
import { formatDate, paperDate } from '../utils/format';
import { theme } from '../theme';
import {
  ACTIVE_STATUSES,
  PUBLISHED_STATUSES,
  PaperStatusChip,
} from './PaperStatusChip';

/** Left status bar color, aligned to the status pill tone. */
const barColorForStatus = (status: PaperStatus): string => {
  if (status === 'revision_required') return theme.colors.state.warning;
  if (status === 'rejected') return theme.colors.state.danger;
  if (PUBLISHED_STATUSES.has(status)) return theme.colors.state.success;
  if (ACTIVE_STATUSES.has(status)) return theme.colors.brand.primary;
  return theme.colors.border.strong;
};

interface MyPaperCardProps {
  paper: ResearchPaper;
  category?: string | null;
  onPress?: () => void;
}

export const MyPaperCard = ({ paper, category, onPress }: MyPaperCardProps) => {
  const isPublished = PUBLISHED_STATUSES.has(paper.status);
  const metaParts = [`${isPublished ? 'Published' : 'Submitted'} ${formatDate(paperDate(paper))}`];
  if (isPublished) {
    metaParts.push(`${paper.view_count || 0} views`);
    metaParts.push(`${paper.download_count || 0} downloads`);
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={paper.title || 'Untitled paper'}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={[styles.bar, { backgroundColor: barColorForStatus(paper.status) }]} />
      <View style={styles.top}>
        {category && category.trim() ? (
          <Text style={styles.category} numberOfLines={1}>
            {category}
          </Text>
        ) : (
          <View style={styles.categorySpacer} />
        )}
        <PaperStatusChip status={paper.status} />
      </View>
      <Text style={styles.title} numberOfLines={3}>
        {paper.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {metaParts.join('   ·   ')}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radii.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 18,
    paddingRight: theme.spacing.lg,
    gap: 6,
  },
  cardPressed: {
    opacity: 0.7,
  },
  bar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  category: {
    flex: 1,
    marginTop: 3,
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.colors.text.muted,
  },
  categorySpacer: {
    flex: 1,
  },
  title: {
    fontFamily: theme.fontFamilies.display.semibold,
    fontSize: 16,
    lineHeight: 21,
    color: theme.colors.text.primary,
  },
  meta: {
    fontFamily: theme.fontFamilies.ui.medium,
    fontSize: 12,
    color: theme.colors.text.disabled,
    fontVariant: ['tabular-nums'],
  },
});
