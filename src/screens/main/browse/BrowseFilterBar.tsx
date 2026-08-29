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
}: BrowseFilterBarProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const fieldActive = fieldLabel !== 'All fields';
  const deptActive = deptLabel !== 'All departments';
  const yearActive = yearLabel !== 'All Years';

  return (
    <View style={styles.subbar}>
      <Text style={styles.resultCount}>
        {resultCount} {resultCount === 1 ? 'Paper' : 'Papers'}
      </Text>
      <View style={styles.pillsRow}>
        <PressableScale
          style={[styles.pill, fieldActive && styles.pillActive]}
          onPress={onOpenFieldSheet}
          accessibilityRole="button"
          accessibilityLabel={`Field: ${fieldLabel}`}
          hitSlop={8}
        >
          <Text
            style={[styles.pillText, fieldActive && styles.pillTextActive]}
            numberOfLines={1}
          >
            {fieldLabel}
          </Text>
          <Icon
            icon={ChevronDown}
            size={14}
            color={fieldActive ? theme.colors.brand.primary : theme.colors.text.secondary}
          />
        </PressableScale>
        <PressableScale
          style={[styles.pill, deptActive && styles.pillActive]}
          onPress={onOpenDeptSheet}
          accessibilityRole="button"
          accessibilityLabel={`Department or program: ${deptLabel}`}
          hitSlop={8}
        >
          <Text
            style={[styles.pillText, deptActive && styles.pillTextActive]}
            numberOfLines={1}
          >
            {deptLabel}
          </Text>
          <Icon
            icon={ChevronDown}
            size={14}
            color={deptActive ? theme.colors.brand.primary : theme.colors.text.secondary}
          />
        </PressableScale>
        <PressableScale
          style={[styles.pill, yearActive && styles.pillActive]}
          onPress={onOpenYearSheet}
          accessibilityRole="button"
          accessibilityLabel={`Year: ${yearLabel}`}
          hitSlop={8}
        >
          <Text style={[styles.pillText, yearActive && styles.pillTextActive]}>{yearLabel}</Text>
          <Icon
            icon={ChevronDown}
            size={14}
            color={yearActive ? theme.colors.brand.primary : theme.colors.text.secondary}
          />
        </PressableScale>
        <View style={styles.viewToggle}>
          <PressableScale
            style={[styles.vt, viewMode === 'list' && styles.vtActive]}
            onPress={() => onChangeViewMode('list')}
            accessibilityRole="button"
            accessibilityLabel="List view"
          >
            <Icon
              icon={List}
              size={17}
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
              size={15}
              color={viewMode === 'grid' ? theme.colors.brand.primary : theme.colors.text.muted}
            />
          </PressableScale>
        </View>
      </View>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    subbar: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: theme.spacing.sm,
    },
    resultCount: {
      fontFamily: theme.fontFamilies.ui.semibold,
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.colors.text.disabled,
    },
    pillsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.radii.pill,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border.subtle,
      backgroundColor: theme.colors.surface.raised,
      maxWidth: 128,
    },
    pillActive: {
      backgroundColor: theme.colors.brand.primarySoft,
      borderColor: theme.colors.brand.primary,
    },
    pillText: {
      fontFamily: theme.fontFamilies.ui.medium,
      fontSize: 13,
      color: theme.colors.text.secondary,
      flexShrink: 1,
    },
    pillTextActive: {
      color: theme.colors.brand.primary,
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
    },
  });
