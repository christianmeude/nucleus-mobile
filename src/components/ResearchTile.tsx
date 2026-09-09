import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ResearchPaper } from '../types/domain';
import { formatDate, getPrimaryAuthorName, paperDate } from '../utils/format';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { CategoryChip, PublishedBadge } from './ui';

interface ResearchTileProps {
  paper: ResearchPaper;
  /** Pre-resolved category name (UUID-guarded upstream); null hides the chip. */
  category?: string | null;
  /** Category accent hue; the chip palette derives from it. */
  categoryColor?: string;
  onPress?: () => void;
}

/**
 * Compact 2-column tile for the Browse Hybrid grid. Display-serif title,
 * contrast-safe category chip, formal-publication badge, author, and
 * views · date footer on a fixed-height card so grid rows stay uniform.
 */
export const ResearchTile = memo(function ResearchTile({
  paper,
  category,
  categoryColor,
  onPress,
}: ResearchTileProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const authorName = getPrimaryAuthorName(paper);
  const dotColor = categoryColor ?? theme.colors.brand.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={paper.title || 'Untitled paper'}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed ? styles.pressed : null]}
    >
      <View style={styles.catRow}>
        {category ? <CategoryChip label={category} accent={dotColor} style={styles.chip} /> : null}
        {paper.status === 'published' ? (
          <View style={styles.badgeRight}>
            <PublishedBadge size="sm" />
          </View>
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {paper.title}
      </Text>

      <View style={styles.footerWrap}>
        <Text style={styles.author} numberOfLines={1}>
          {authorName}
        </Text>
        <View style={styles.foot}>
          <Text style={styles.footText}>{paper.view_count || 0} views</Text>
          <Text style={styles.footSep}>·</Text>
          <Text style={styles.footText}>{formatDate(paperDate(paper))}</Text>
        </View>
      </View>
    </Pressable>
  );
});

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    tile: {
      height: 148,
      backgroundColor: t.colors.surface.raised,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      padding: t.spacing.md,
      gap: t.spacing.xs,
      ...t.shadows.level1,
    },
    pressed: {
      opacity: 0.96,
      transform: [{ scale: t.motion.pressScale }],
    },
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    chip: {
      flexShrink: 1,
    },
    badgeRight: {
      marginLeft: 'auto',
    },
    title: {
      fontFamily: t.fontFamilies.display.semibold,
      fontSize: 14,
      lineHeight: 19,
      color: t.colors.text.primary,
      marginTop: 2,
    },
    footerWrap: {
      marginTop: 'auto',
      gap: t.spacing.xs,
    },
    author: {
      ...t.typography.caption,
      color: t.colors.text.muted,
    },
    foot: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs,
    },
    footText: {
      ...t.typography.caption,
      color: t.colors.text.muted,
    },
    footSep: {
      ...t.typography.caption,
      color: t.colors.border.strong,
    },
  });
