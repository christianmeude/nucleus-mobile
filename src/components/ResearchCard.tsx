import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from './ui/Icon';
import { Eye } from 'lucide-react-native';
import { PressableCard, Surface } from './ui';
import { ResearchPaper } from '../types/domain';
import { formatDate, getPrimaryAuthorName, paperDate, statusToLabel } from '../utils/format';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { PaperProgressMap } from './PaperProgressMap';
import { useListEntranceActive } from './ListEntranceItem';

interface ResearchCardProps {
  paper: ResearchPaper;
  onPress?: () => void;
  showEngagementCounts?: boolean;
  showStatusChip?: boolean;
  categoryLine?: string;
  keywords?: string[];
}

export const ResearchCard = memo(
  ({
    paper,
    onPress,
    showEngagementCounts = false,
    showStatusChip = true,
    categoryLine,
    keywords,
  }: ResearchCardProps) => {
    const { theme } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const authorName = getPrimaryAuthorName(paper);
    const authorInitial = authorName.trim().charAt(0).toUpperCase() || '?';
    const displayKeywords = (Array.isArray(keywords) ? keywords : []).filter(Boolean).slice(0, 4);
    const keywordTint = `${theme.colors.brand.accent}33`;
    const isEntering = useListEntranceActive();
    const readOnlyShadow = isEntering ? 'level0' : 'level2';

    const body = (
      <View style={styles.content}>
        {categoryLine && categoryLine.trim() ? (
          <Text style={styles.categoryLine} numberOfLines={1}>
            {categoryLine}
          </Text>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>
          {paper.title}
        </Text>
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorAvatarText}>{authorInitial}</Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {authorName} · {formatDate(paperDate(paper))}
          </Text>
        </View>
        {showStatusChip ? <PaperProgressMap status={paper.status} variant="list" /> : null}
        {displayKeywords.length > 0 ? (
          <View style={styles.keywordRow}>
            {displayKeywords.map((keyword, index) => (
              <View
                key={`${keyword}-${index}`}
                style={[styles.keywordChip, { backgroundColor: keywordTint }]}
              >
                <Text style={styles.keywordText} numberOfLines={1}>
                  {keyword}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {showEngagementCounts === true ? (
          <View
            style={[
              styles.engagementRow,
              displayKeywords.length > 0 ? styles.engagementAfterKeywords : null,
            ]}
          >
            <View style={styles.engagementItem}>
              <Icon icon={Eye} size={14} color={theme.colors.text.muted} />
              <Text style={styles.meta}>{paper.view_count || 0} views</Text>
            </View>
          </View>
        ) : null}
      </View>
    );

    if (onPress) {
      const a11yTitle = paper.title || 'Untitled paper';
      const statusLabel = statusToLabel(paper.status);
      return (
        <PressableCard
          onPress={onPress}
          accessibilityLabel={`${a11yTitle}, ${statusLabel}`}
          elevation="level2"
        >
          {body}
        </PressableCard>
      );
    }
    return (
      <Surface elevation={readOnlyShadow} style={styles.readOnly}>
        {body}
      </Surface>
    );
  },
);

ResearchCard.displayName = 'ResearchCard';

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    readOnly: {
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      padding: t.spacing.lg,
    },
    content: {
      gap: t.spacing.sm,
    },
    categoryLine: {
      ...t.typography.caption,
      color: t.colors.text.muted,
    },
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
    },
    authorAvatar: {
      width: 32,
      height: 32,
      borderRadius: t.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.brand.primary,
    },
    authorAvatarText: {
      ...t.typography.caption,
      color: t.colors.text.onBrand,
    },
    keywordRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.spacing.xs,
      paddingRight: t.spacing.xs,
    },
    keywordChip: {
      borderRadius: t.radii.sm,
      paddingHorizontal: t.spacing.sm,
      paddingVertical: 2,
    },
    keywordText: {
      ...t.typography.caption,
      color: t.colors.text.primary,
    },
    engagementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.md,
    },
    engagementAfterKeywords: {
      marginTop: -t.spacing.xs,
    },
    engagementItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    title: {
      ...t.typography.h3,
      color: t.colors.text.primary,
    },
    meta: {
      ...t.typography.metadata,
      color: t.colors.text.muted,
    },
  });
