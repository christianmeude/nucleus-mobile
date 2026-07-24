import { StyleSheet, Text, View } from 'react-native';
import { ResearchPaper } from '../types/domain';
import { getPrimaryAuthorName, formatDate, paperDate } from '../utils/format';
import { PressableCard } from './ui';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { PaperProgressMap } from './PaperProgressMap';
import { PUBLISHED_STATUSES } from './PaperStatusChip';

export interface StandardPaperCardProps {
  paper: ResearchPaper;
  variant: 'papers' | 'browse';
  category?: string | null;
  categoryColor?: string;
  onPress: () => void;
}

export const StandardPaperCard = ({
  paper,
  variant,
  category,
  categoryColor,
  onPress,
}: StandardPaperCardProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const dotColor = categoryColor ?? theme.colors.brand.primary;
  const showCategory = category && category.trim().length > 0;

  const dateStr = formatDate(paperDate(paper));
  const authorName = getPrimaryAuthorName(paper);
  const isPublished = PUBLISHED_STATUSES.has(paper.status);

  const metaParts: string[] = [];
  if (variant === 'papers') {
    metaParts.push(`${isPublished ? 'Approved' : 'Submitted'} ${dateStr}`);
  } else {
    metaParts.push(`${authorName} · ${dateStr}`);
    metaParts.push(`${paper.view_count || 0} views`);
  }

  const title = paper.title || 'Untitled paper';

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={title}
      elevation="level1"
    >
      <View style={styles.content}>
        {showCategory ? (
          <View style={styles.catRow}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text style={[styles.cat, { color: dotColor }]} numberOfLines={1}>
              {category}
            </Text>
          </View>
        ) : null}
        
        <Text style={styles.title} numberOfLines={variant === 'browse' ? 2 : 3}>
          {title}
        </Text>
        
        <Text style={styles.meta} numberOfLines={1}>
          {metaParts.join('   ·   ')}
        </Text>

        {variant === 'papers' ? <PaperProgressMap status={paper.status} /> : null}
      </View>
    </PressableCard>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    content: {
      gap: 6,
    },
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: t.radii.pill,
    },
    cat: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 10,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
      flex: 1,
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
