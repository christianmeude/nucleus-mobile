import { Pressable, StyleSheet, Text } from 'react-native';
import { ResearchPaper } from '../types/domain';
import { formatDate, paperDate } from '../utils/format';
import { theme } from '../theme';
import { PUBLISHED_STATUSES } from './PaperStatusChip';
import { PaperProgressMap } from './PaperProgressMap';

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
      {category && category.trim() ? (
        <Text style={styles.category} numberOfLines={1}>
          {category}
        </Text>
      ) : null}
      <Text style={styles.title} numberOfLines={3}>
        {paper.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {metaParts.join('   ·   ')}
      </Text>
      <PaperProgressMap status={paper.status} />
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
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: theme.spacing.lg,
    gap: 6,
  },
  cardPressed: {
    opacity: 0.7,
  },
  category: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.colors.text.muted,
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
