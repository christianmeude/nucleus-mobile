import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ResearchPaper } from '../types/domain';
import { formatDate, getPrimaryAuthorName, paperDate } from '../utils/format';
import { theme } from '../theme';

interface ResearchTileProps {
  paper: ResearchPaper;
  /** Pre-resolved category name (UUID-guarded upstream); null hides the eyebrow. */
  category?: string | null;
  /** Dot + label color; defaults to navy. Gold is reserved for the Browse hero. */
  categoryColor?: string;
  onPress?: () => void;
}

/**
 * Compact 2-column tile for the Browse Hybrid grid. Source Serif 4 title, color-dot
 * category eyebrow, author, and views · date footer. `ResearchCard` remains the
 * single-column card used elsewhere (My Papers, etc.).
 */
export const ResearchTile = ({
  paper,
  category,
  categoryColor = theme.colors.brand.primary,
  onPress,
}: ResearchTileProps) => {
  const authorName = getPrimaryAuthorName(paper);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={paper.title || 'Untitled paper'}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed ? styles.pressed : null]}
    >
      {category ? (
        <View style={styles.catRow}>
          <View style={[styles.dot, { backgroundColor: categoryColor }]} />
          <Text style={[styles.cat, { color: categoryColor }]} numberOfLines={1}>
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
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 132,
    backgroundColor: theme.colors.surface.raised,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.subtle,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    ...theme.shadows.level1,
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: theme.motion.pressScale }],
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: theme.radii.pill,
  },
  cat: {
    fontFamily: theme.fontFamilies.ui.semibold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: theme.fontFamilies.display.semibold,
    fontSize: 14,
    lineHeight: 19,
    color: theme.colors.text.primary,
  },
  author: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: 'auto',
  },
  footText: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
  },
  footSep: {
    ...theme.typography.caption,
    color: theme.colors.border.strong,
  },
});
