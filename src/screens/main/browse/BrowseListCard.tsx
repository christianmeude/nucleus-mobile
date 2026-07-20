import { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ResearchPaper } from '../../../types/domain';
import { getPrimaryAuthorName, formatDate, paperDate } from '../../../utils/format';
import { PressableScale } from '../../../components/ui';
import { useThemedStyles } from '../../../context/ThemeContext';
import { type Theme } from '../../../theme';

export interface BrowseListCardProps {
  paper: ResearchPaper;
  categoryColor: string;
  categoryName: string | null;
  onOpen: (paperId: string) => void;
}

export const BrowseListCard = memo(function BrowseListCard({
  paper,
  categoryColor,
  categoryName,
  onOpen,
}: BrowseListCardProps) {
  const styles = useThemedStyles(makeStyles);
  const handlePress = useCallback(() => onOpen(paper.id), [onOpen, paper.id]);

  return (
    <PressableScale
      style={styles.card}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={paper.title || 'Untitled paper'}
    >
      <View style={styles.cardCatRow}>
        <View style={[styles.dot, { backgroundColor: categoryColor }]} />
        <Text style={[styles.cardCat, { color: categoryColor }]} numberOfLines={1}>
          {categoryName || 'Research'}
        </Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {paper.title}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        {getPrimaryAuthorName(paper)} · {formatDate(paperDate(paper))}
      </Text>
    </PressableScale>
  );
});

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface.raised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border.subtle,
      borderRadius: theme.radii.lg,
      borderCurve: 'continuous',
      padding: theme.spacing.lg,
      gap: 6,
    },
    cardCatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: theme.radii.pill,
    },
    cardCat: {
      fontFamily: theme.fontFamilies.ui.semibold,
      fontSize: 10,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
      flex: 1,
    },
    cardTitle: {
      fontFamily: theme.fontFamilies.display.semibold,
      fontSize: 16,
      lineHeight: 21,
      color: theme.colors.text.primary,
    },
    cardMeta: {
      fontFamily: theme.fontFamilies.ui.regular,
      fontSize: 12,
      color: theme.colors.text.muted,
    },
  });
