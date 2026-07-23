import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { AnimatedNumber } from './ui/motion/AnimatedNumber';
import { FacultyWorkloadSummary } from '../api/faculty';

export type WorkloadFilter = 'needs_review' | 'revision_sent' | 'completed' | null;

interface WorkloadStripProps {
  summary: FacultyWorkloadSummary;
  activeFilter: WorkloadFilter;
  onFilterChange: (filter: WorkloadFilter) => void;
}

export const WorkloadStrip = ({ summary, activeFilter, onFilterChange }: WorkloadStripProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const tiles = [
    {
      id: 'needs_review' as const,
      label: 'Needs Review',
      count: summary.pendingReview,
    },
    {
      id: 'revision_sent' as const,
      label: 'Revision Sent',
      count: summary.revisionRequired,
    },
    {
      id: 'completed' as const,
      label: 'Completed',
      count: summary.approvedByYou,
    },
  ];

  const handlePress = (id: WorkloadFilter) => {
    onFilterChange(activeFilter === id ? null : id);
  };

  return (
    <View style={styles.container}>
      {tiles.map((tile, index) => {
        const isActive = activeFilter === tile.id;
        return (
          <View key={tile.id} style={styles.tileWrapper}>
            <Pressable
              onPress={() => handlePress(tile.id)}
              style={[styles.tile, isActive && styles.tileActive]}
            >
              <AnimatedNumber
                value={tile.count}
                style={[styles.count, isActive && styles.countActive]}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>{tile.label}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.lg,
    },
    tileWrapper: {
      flex: 1,
    },
    tile: {
      backgroundColor: t.colors.surface.raised,
      borderRadius: t.radii.lg,
      padding: t.spacing.md,
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: 'transparent',
      ...t.shadows.level1,
    },
    tileActive: {
      backgroundColor: t.colors.brand.primarySurface,
      borderColor: t.colors.brand.primary,
    },
    count: {
      ...t.typography.h2,
      color: t.colors.text.primary,
      marginBottom: t.spacing.xs,
    },
    countActive: {
      color: t.colors.brand.primary,
    },
    label: {
      ...t.typography.caption,
      color: t.colors.text.secondary,
    },
    labelActive: {
      color: t.colors.brand.primary,
    },
  });
