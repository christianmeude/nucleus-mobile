import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ResearchPaper } from '../types/domain';
import { getPrimaryAuthorName, formatDate, paperDate } from '../utils/format';
import { PressableCard, PublishedBadge, Icon } from './ui';
import { ArrowRight } from 'lucide-react-native';
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
  onRequestPublication?: () => void;
}

export const StandardPaperCard = memo(({
  paper,
  variant,
  category,
  categoryColor,
  onPress,
  onRequestPublication,
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
        
        {paper.status === 'published' && (
          <View style={{ marginBottom: 2 }}>
            <PublishedBadge />
          </View>
        )}

        <Text style={styles.title} numberOfLines={variant === 'browse' ? 2 : 3}>
          {title}
        </Text>
        
        <Text style={styles.meta} numberOfLines={1}>
          {metaParts.join('   ·   ')}
        </Text>

        {variant === 'papers' ? (
          <View style={styles.progressContainer}>
            <PaperProgressMap status={paper.status} variant="list" />
            {paper.status === 'approved' && !paper.publish_requested_at && !!onRequestPublication && (
              <Pressable
                onPress={onRequestPublication}
                style={({ pressed }) => [styles.actionLink, pressed && { opacity: 0.6 }]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Request Publication"
              >
                <Text style={styles.actionLinkText}>Request formal publication</Text>
                <Icon icon={ArrowRight} size={14} color={theme.colors.brand.primary} />
              </Pressable>
            )}
            {paper.status === 'approved' && paper.publish_requested_at && (
              <View style={styles.pendingRow}>
                <Text style={styles.pendingText}>Publication requested (pending admin review)</Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </PressableCard>
  );
});

StandardPaperCard.displayName = 'StandardPaperCard';

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
      borderCurve: 'continuous',
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
    progressContainer: {
      gap: 12,
      marginTop: 4,
    },
    actionLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: t.colors.brand.primarySoft,
      borderRadius: t.radii.pill,
      alignSelf: 'center',
    },
    actionLinkText: {
      fontFamily: t.fontFamilies.ui.bold,
      fontSize: 11,
      color: t.colors.brand.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    pendingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    pendingText: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 11,
      color: t.colors.text.disabled,
      fontStyle: 'italic',
    },
  });
