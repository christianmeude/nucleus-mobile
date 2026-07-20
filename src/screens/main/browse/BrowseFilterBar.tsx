import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../../../components/ui';
import { type Theme } from '../../../theme';

type ViewMode = 'list' | 'grid';

export interface BrowseFilterBarProps {
  resultCount: number;
  fieldLabel: string;
  sortLabel: string;
  viewMode: ViewMode;
  onOpenFieldSheet: () => void;
  onOpenSortSheet: () => void;
  onChangeViewMode: (mode: ViewMode) => void;
  styles: ReturnType<typeof makeStyles>;
  theme: Theme;
}

export const BrowseFilterBar = ({
  resultCount,
  fieldLabel,
  sortLabel,
  viewMode,
  onOpenFieldSheet,
  onOpenSortSheet,
  onChangeViewMode,
  styles,
  theme,
}: BrowseFilterBarProps) => {
  return (
    <View style={styles.subbar}>
      <Text style={styles.resultCount}>
        {resultCount} {resultCount === 1 ? 'Paper' : 'Papers'}
      </Text>
      <View style={styles.subbarRight}>
        <PressableScale
          style={styles.sortLink}
          onPress={onOpenFieldSheet}
          accessibilityRole="button"
          accessibilityLabel={`Field: ${fieldLabel}`}
          hitSlop={8}
        >
          <Text style={styles.fieldLinkText} numberOfLines={1}>
            {fieldLabel}
          </Text>
          <Ionicons name="chevron-down" size={13} color={theme.colors.brand.primary} />
        </PressableScale>
        <PressableScale
          style={styles.sortLink}
          onPress={onOpenSortSheet}
          accessibilityRole="button"
          accessibilityLabel={`Sort: ${sortLabel}`}
          hitSlop={8}
        >
          <Text style={styles.sortLinkText}>{sortLabel}</Text>
          <Ionicons name="chevron-down" size={13} color={theme.colors.brand.primary} />
        </PressableScale>
        <View style={styles.viewToggle}>
          <PressableScale
            style={[styles.vt, viewMode === 'list' && styles.vtActive]}
            onPress={() => onChangeViewMode('list')}
            accessibilityRole="button"
            accessibilityLabel="List view"
          >
            <Ionicons
              name="reorder-three-outline"
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
            <Ionicons
              name="grid-outline"
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
    subbarRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    sortLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    sortLinkText: {
      fontFamily: theme.fontFamilies.ui.medium,
      fontSize: 13,
      color: theme.colors.brand.primary,
    },
    fieldLinkText: {
      fontFamily: theme.fontFamilies.ui.medium,
      fontSize: 13,
      color: theme.colors.brand.primary,
      maxWidth: 128,
    },
    viewToggle: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface.sunken,
      borderRadius: theme.radii.pill,
      padding: 3,
      gap: 2,
    },
    vt: {
      width: 30,
      height: 26,
      borderRadius: theme.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    vtActive: {
      backgroundColor: theme.colors.surface.raised,
    },
  });
