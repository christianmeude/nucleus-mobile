import { StyleSheet, Text, View } from 'react-native';
import { PressableCard } from './ui';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { formatDate } from '../utils/format';
import { type FacultyAssignedPaper, FACULTY_ADVANCED_STATUSES } from '../api/faculty';
import Animated, { FadeInDown, SlideOutLeft, LinearTransition } from 'react-native-reanimated';

interface FacultyPaperCardProps {
  paper: FacultyAssignedPaper;
  onPress: () => void;
  index?: number;
}

const getStatusConfig = (status: string, t: Theme) => {
  if (status === 'pending_faculty') {
    return {
      color: t.colors.brand.accent,
      bg: t.colors.brand.accentSurface,
      label: 'Needs Review',
    };
  }
  if (status === 'revision_required') {
    return {
      color: t.colors.state.warning,
      bg: t.colors.state.warningSurface,
      label: 'Revision Sent',
    };
  }
  if (FACULTY_ADVANCED_STATUSES.has(status)) {
    const isFinal = status === 'approved' || status === 'published';
    return {
      color: t.colors.state.success,
      bg: t.colors.state.successSurface,
      label: isFinal ? 'Approved' : 'Forwarded',
    };
  }
  return {
    color: t.colors.border.subtle,
    bg: t.colors.surface.sunken,
    label: status.replace(/_/g, ' '),
  };
};

const getDaysWaiting = (dateStr?: string | null) => {
  if (!dateStr) return 0;
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

export const FacultyPaperCard = ({ paper, onPress, index }: FacultyPaperCardProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const config = getStatusConfig(paper.status, theme);
  const daysWaiting = getDaysWaiting(paper.submissionDate || paper.createdAt);

  const cardContent = (
    <Animated.View
      layout={LinearTransition.springify().damping(16)}
      entering={index !== undefined ? FadeInDown.delay(index * 50).springify().damping(14) : undefined}
      exiting={SlideOutLeft.duration(300)}
    >
      <PressableCard
        accessibilityLabel={`Review ${paper.title}`}
        onPress={onPress}
        style={[styles.cardContainer, theme.shadows.level1]}
      >
        <View style={[styles.leftBar, { backgroundColor: config.color }]} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {paper.title}
            </Text>
            <View style={[styles.pill, { backgroundColor: config.bg }]}>
              <Text style={[styles.pillText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.meta} numberOfLines={1}>
              {paper.authorName} · {formatDate(paper.submissionDate || paper.createdAt)}
            </Text>
            <Text style={styles.daysText}>{daysWaiting === 1 ? '1 day' : `${daysWaiting} days`}</Text>
          </View>
        </View>
      </PressableCard>
    </Animated.View>
  );

  return cardContent;
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    cardContainer: {
      flexDirection: 'row',
      overflow: 'hidden',
      padding: 0,
    },
    leftBar: {
      width: 4,
      // The corner radius matches card's left edge naturally via overflow: 'hidden' on PressableCard
    },
    content: {
      flex: 1,
      padding: t.spacing.lg,
      gap: t.spacing.xs,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: t.spacing.md,
    },
    title: {
      flex: 1,
      ...t.typography.bodyStrong,
      color: t.colors.text.primary,
    },
    pill: {
      paddingHorizontal: t.spacing.sm,
      paddingVertical: 2,
      borderRadius: t.radii.pill,
    },
    pillText: {
      ...t.typography.caption,
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: t.spacing.xs,
    },
    meta: {
      flex: 1,
      ...t.typography.metadata,
      color: t.colors.text.muted,
      marginRight: t.spacing.md,
    },
    daysText: {
      ...t.typography.caption,
      color: t.colors.text.muted,
    },
  });
