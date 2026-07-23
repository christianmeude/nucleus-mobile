import { Pressable, StyleSheet, Text } from 'react-native';
import { ResearchPaper } from '../types/domain';
import { formatDate, paperDate } from '../utils/format';
import { useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { PUBLISHED_STATUSES } from './PaperStatusChip';
import { PaperProgressMap } from './PaperProgressMap';

interface MyPaperCardProps {
  paper: ResearchPaper;
  category?: string | null;
  onPress?: () => void;
}

export const MyPaperCard = ({ paper, category, onPress }: MyPaperCardProps) => {
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.colors.surface.raised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      paddingTop: 14,
      paddingBottom: 14,
      paddingHorizontal: t.spacing.lg,
      gap: 6,
      ...t.shadows.level1,
    },
    cardPressed: {
      opacity: 0.7,
    },
    category: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: t.colors.text.muted,
    },
    title: {
      fontFamily: t.fontFamilies.display.semibold,
      fontSize: 16,
      lineHeight: 21,
      color: t.colors.text.primary,
    },
    meta: {
      fontFamily: t.fontFamilies.ui.medium,
      fontSize: 12,
      color: t.colors.text.disabled,
      fontVariant: ['tabular-nums'],
    },
  });
