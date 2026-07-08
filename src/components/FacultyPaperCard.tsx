import { StyleSheet, Text } from 'react-native';
import { PressableCard } from './ui';
import { useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { formatDate } from '../utils/format';
import { type FacultyAssignedPaper } from '../api/faculty';

interface FacultyPaperCardProps {
  paper: FacultyAssignedPaper;
  onPress: () => void;
}

/**
 * One faculty review-queue row: paper title + "author · submitted date". Shared
 * by the Faculty Dashboard's "Papers to review" list and the Review queue so
 * both render an assignment identically. No status chip — status colour is a
 * student-facing detail only (per the faculty UI unification).
 */
export const FacultyPaperCard = ({ paper, onPress }: FacultyPaperCardProps) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableCard accessibilityLabel={`Review ${paper.title}`} onPress={onPress}>
      <Text style={styles.title} numberOfLines={2}>
        {paper.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {paper.authorName} · {formatDate(paper.submissionDate || paper.createdAt)}
      </Text>
    </PressableCard>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    title: {
      ...t.typography.bodyStrong,
      color: t.colors.text.primary,
    },
    meta: {
      ...t.typography.metadata,
      color: t.colors.text.muted,
      marginTop: t.spacing.xs,
    },
  });
