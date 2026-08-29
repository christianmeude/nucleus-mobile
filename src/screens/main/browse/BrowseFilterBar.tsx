import { StyleSheet, Text, View } from 'react-native';

import { Icon, PressableScale } from '../../../components/ui';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import { type Theme } from '../../../theme';
import { ChevronDown, List, LayoutGrid } from 'lucide-react-native';


type ViewMode = 'list' | 'grid';

export interface BrowseFilterBarProps {
  resultCount: number;
  fieldLabel: string;
  deptLabel: string;
  yearLabel: string;
  viewMode: ViewMode;
  onOpenFieldSheet: () => void;
  onOpenDeptSheet: () => void;
  onOpenYearSheet: () => void;
  onChangeViewMode: (mode: ViewMode) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const BrowseFilterBar = ({
  resultCount,
  fieldLabel,
  deptLabel,
  yearLabel,
  viewMode,
  onOpenFieldSheet,
  onOpenDeptSheet,
  onOpenYearSheet,
  onChangeViewMode,
  onClearFilters,
  hasActiveFilters,
}: BrowseFilterBarProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const fieldActive = fieldLabel !== 'All fields';
  const deptActive = deptLabel !== 'All departments';
  const yearActive = yearLabel !== 'All Years';

  return (
    <View style={styles.subbar}>
      <View style={styles.headerRow}>
        <Text style={styles.resultCount}>
          {resultCount} {resultCount === 1 ? 'Paper' : 'Papers'}
        </Text>
        
        <View style={styles.headerActions}>
          {hasActiveFilters && (
            <PressableScale onPress={onClearFilters} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear</Text>
            </PressableScale>
          )}

          <View style={styles.viewToggle}>
            <PressableScale
              style={[styles.vt, viewMode === 'list' && styles.vtActive]}
              onPress={() => onChangeViewMode('list')}
              accessibilityRole="button"
              accessibilityLabel="List view"
            >
              <Icon
                icon={List}
                size={16}
                color={viewMode === 'list' ? theme.colors.brand.primary : theme.colors.text.muted}
              />
            </PressableScale>
            <PressableScale
              style={[styles.vt, viewMode === 'grid' && styles.vtActive]}
              onPress={() => onChangeViewMode('grid')}
              accessibilityRole="button"
              accessibilityLabel="Grid view"
            >
              <Icon
                icon={LayoutGrid}
                size={14}
                color={viewMode === 'grid' ? theme.colors.brand.primary : theme.colors.text.muted}
              />
            </PressableScale>
          </View>
        </View>
      </View>

      <View style={styles.filterBar}>
        <PressableScale style={styles.filterSegment} onPress={onOpenFieldSheet}>
          <Text style={[styles.segmentText, fieldActive && styles.segmentTextActive]} numberOfLines={1}>
            {fieldLabel}
          </Text>
          <Icon icon={ChevronDown} size={14} color={fieldActive ? theme.colors.brand.primary : theme.colors.text.disabled} />
        </PressableScale>
        
        <View style={styles.divider} />
        
        <PressableScale style={styles.filterSegment} onPress={onOpenDeptSheet}>
          <Text style={[styles.segmentText, deptActive && styles.segmentTextActive]} numberOfLines={1}>
            {deptLabel}
          </Text>
          <Icon icon={ChevronDown} size={14} color={deptActive ? theme.colors.brand.primary : theme.colors.text.disabled} />
        </PressableScale>
        
        <View style={styles.divider} />
        
        <PressableScale style={styles.filterSegment} onPress={onOpenYearSheet}>
          <Text style={[styles.segmentText, yearActive && styles.segmentTextActive]} numberOfLines={1}>
            {yearLabel}
          </Text>
          <Icon icon={ChevronDown} size={14} color={yearActive ? theme.colors.brand.primary : theme.colors.text.disabled} />
        </PressableScale>
      </View>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    subbar: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    resultCount: {
      fontFamily: theme.fontFamilies.ui.semibold,
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.colors.text.disabled,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    clearBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    clearText: {
      fontFamily: theme.fontFamilies.ui.medium,
      fontSize: 13,
      color: theme.colors.text.secondary,
    },
    filterBar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      height: 40,
      borderRadius: theme.radii.lg,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      backgroundColor: theme.colors.surface.base,
      overflow: 'hidden',
    },
    filterSegment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      gap: 4,
    },
    segmentText: {
      fontFamily: theme.fontFamilies.ui.medium,
      fontSize: 13,
      color: theme.colors.text.primary,
      flexShrink: 1,
    },
    segmentTextActive: {
      color: theme.colors.brand.primary,
      fontFamily: theme.fontFamilies.ui.semibold,
    },
    divider: {
      width: 1,
      backgroundColor: theme.colors.border.subtle,
      marginVertical: 8,
    },
    viewToggle: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface.sunken,
      borderRadius: theme.radii.pill,
      borderCurve: 'continuous',
      padding: 3,
      gap: 2,
    },
    vt: {
      width: 30,
      height: 26,
      borderRadius: theme.radii.pill,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
    },
    vtActive: {
      backgroundColor: theme.colors.surface.raised,
      ...theme.shadows.level1,
    },
  });
