import { StyleSheet, Text, View } from 'react-native';

import { Icon, PressableScale } from '../../../components/ui';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import { type Theme } from '../../../theme';
import { List, LayoutGrid } from 'lucide-react-native';

type ViewMode = 'list' | 'grid';

export interface BrowseControlsProps {
  resultCount: number;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
}

export const BrowseControls = ({ resultCount, viewMode, onChangeViewMode }: BrowseControlsProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.subbar}>
      <Text style={styles.resultCount}>
        {resultCount} {resultCount === 1 ? 'Paper' : 'Papers'}
      </Text>

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
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    subbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    resultCount: {
      fontFamily: theme.fontFamilies.ui.semibold,
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.colors.text.muted,
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
