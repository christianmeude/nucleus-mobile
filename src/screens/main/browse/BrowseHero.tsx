import { StyleSheet, Text, View } from 'react-native';
import { ResearchPaper } from '../../../types/domain';
import { getPrimaryAuthorName } from '../../../utils/format';
import { PressableScale } from '../../../components/ui';
import { type Theme } from '../../../theme';

export interface BrowseHeroProps {
  featured: ResearchPaper;
  viewsOf: (paper: ResearchPaper) => number;
  onOpen: (paperId: string) => void;
  styles: ReturnType<typeof makeStyles>;
}

export const BrowseHero = ({ featured, viewsOf, onOpen, styles }: BrowseHeroProps) => {
  return (
    <PressableScale
      style={styles.hero}
      onPress={() => onOpen(featured.id)}
      accessibilityRole="button"
      accessibilityLabel={`Featured paper: ${featured.title || 'Untitled paper'}`}
    >
      <View style={styles.heroRingLg} />
      <View style={styles.heroRingSm} />
      <Text style={styles.heroBadge}>Featured Paper</Text>
      <Text style={styles.heroTitle} numberOfLines={3}>
        {featured.title}
      </Text>
      <View style={styles.heroMeta}>
        <Text style={styles.heroMetaText} numberOfLines={1}>
          {getPrimaryAuthorName(featured)}
        </Text>
        <Text style={styles.heroMetaSep}>·</Text>
        <Text style={styles.heroMetaText}>{viewsOf(featured)} views</Text>
      </View>
    </PressableScale>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    hero: {
      backgroundColor: theme.colors.brand.primary,
      borderRadius: theme.radii.xl,
      padding: theme.spacing.xl,
      overflow: 'hidden',
    },
    heroRingLg: {
      position: 'absolute',
      right: -30,
      bottom: -30,
      width: 120,
      height: 120,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.09)',
    },
    heroRingSm: {
      position: 'absolute',
      right: -10,
      bottom: -10,
      width: 80,
      height: 80,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    heroBadge: {
      fontFamily: theme.fontFamilies.ui.semibold,
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: theme.colors.brand.accent,
      marginBottom: theme.spacing.sm,
    },
    heroTitle: {
      fontFamily: theme.fontFamilies.display.semibold,
      fontSize: 20,
      lineHeight: 26,
      color: theme.colors.text.onBrand,
      marginBottom: theme.spacing.md,
    },
    heroMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    heroMetaText: {
      ...theme.typography.caption,
      color: 'rgba(255, 255, 255, 0.6)',
      flexShrink: 1,
    },
    heroMetaSep: {
      ...theme.typography.caption,
      color: 'rgba(255, 255, 255, 0.3)',
    },
  });
