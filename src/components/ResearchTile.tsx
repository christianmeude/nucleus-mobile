import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ResearchPaper } from '../types/domain';
import { formatDate, getPrimaryAuthorName, paperDate } from '../utils/format';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';

interface ResearchTileProps {
  paper: ResearchPaper;
  /** Pre-resolved category name (UUID-guarded upstream); null hides the eyebrow. */
  category?: string | null;
  /** Dot + label color; defaults to navy. Gold is reserved for the Browse hero. */
  categoryColor?: string;
  onPress?: () => void;
}

/**
 * Compact 2-column tile for the Browse Hybrid grid. Display-serif title, color-dot
 * category eyebrow, author, and views · date footer. `ResearchCard` remains the
 * single-column card used elsewhere (My Papers, etc.).
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
      {category ? (
        <View style={styles.catRow}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={[styles.cat, { color: dotColor }]} numberOfLines={1}>
            {category}
          </Text>
        </View>
      ) : null}
      <Text style={styles.title} numberOfLines={3}>
        {paper.title}
      </Text>
      <Text style={styles.author} numberOfLines={1}>
        {authorName}
      </Text>
      <View style={styles.foot}>
        <Text style={styles.footText}>{paper.view_count || 0} views</Text>
        <Text style={styles.footSep}>·</Text>
        <Text style={styles.footText}>{formatDate(paperDate(paper))}</Text>
      </View>
    </Pressable>
  );
});

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    tile: {
      flex: 1,
      minHeight: 132,
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
      gap: t.spacing.xs,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: t.radii.pill,
    },
    cat: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 10,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    title: {
      fontFamily: t.fontFamilies.display.semibold,
      fontSize: 14,
      lineHeight: 19,
      color: t.colors.text.primary,
    },
    author: {
      ...t.typography.caption,
      color: t.colors.text.muted,
    },
    foot: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs,
      marginTop: 'auto',
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
