import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableCard } from './ui/Card';
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

export const ResearchCard = ({
  paper,
  onPress,
  showEngagementCounts = false,
  showStatusChip = true,
  categoryLine,
  keywords,
}: ResearchCardProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isEntering = useListEntranceActive();
  const authorName = getPrimaryAuthorName(paper);
  const authorInitial = authorName.trim().charAt(0).toUpperCase() || '?';
  const displayKeywords = (Array.isArray(keywords) ? keywords : []).filter(Boolean).slice(0, 4);
  const keywordTint = `${theme.colors.brand.accent}33`;
  const cardShadow = isEntering ? theme.shadows.level0 : theme.shadows.level2;

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
      {showStatusChip ? <PaperProgressMap status={paper.status} /> : null}
      {displayKeywords.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.keywordRow}
        >
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
        </ScrollView>
      ) : null}
      {showEngagementCounts === true ? (
        <View
          style={[
            styles.engagementRow,
            displayKeywords.length > 0 ? styles.engagementAfterKeywords : null,
          ]}
        >
          <View style={styles.engagementItem}>
            <Ionicons name="eye-outline" size={14} color={theme.colors.text.muted} />
            <Text style={styles.meta}>{paper.view_count || 0}</Text>
          </View>
          <View style={styles.engagementItem}>
            <Ionicons name="download-outline" size={14} color={theme.colors.text.muted} />
            <Text style={styles.meta}>{paper.download_count || 0}</Text>
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
        style={cardShadow}
      >
        {body}
      </PressableCard>
    );
  }
  return <View style={[styles.readOnly, cardShadow]}>{body}</View>;
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    readOnly: {
      backgroundColor: t.colors.surface.raised,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
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
