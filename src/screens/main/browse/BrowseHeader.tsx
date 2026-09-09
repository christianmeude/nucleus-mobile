import { useMemo } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { SearchField } from '../../../components/ui';
import { useThemedStyles } from '../../../context/ThemeContext';
import { type Theme } from '../../../theme';

const EXPLORE_DRAG_DISTANCE = 110;
const EXPLORE_COMMIT_THRESHOLD = 0.4;
const EXPLORE_ARROW_SIZE = 34;

const SUGGESTED_SEARCHES = [
  'Machine learning',
  'Mental health',
  'Climate change',
  'Data privacy',
  'Renewable energy',
  'Online learning',
];

export interface BrowseHeaderProps {
  query: string;
  setQuery: (text: string) => void;
  submitSearch: () => void;
  clearSearch: () => void;
  showClear: boolean;
  filterNode?: React.ReactNode;
}

export const BrowseHeader = ({ query, setQuery, submitSearch, filterNode }: BrowseHeaderProps) => {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.headerBlock}>
      <View style={styles.searchRow}>
        <View style={styles.searchFlex}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            placeholder="Search papers"
            accessibilityLabel="Search papers"
            accessibilityHint="Filters published papers by title, author, or keyword"
          />
        </View>
        {filterNode}
      </View>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    headerBlock: {
      position: 'relative',
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    searchFlex: {
      flex: 1,
    },
    greeting: {
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      textAlign: 'center',
      paddingBottom: theme.spacing.lg,
      fontFamily: theme.fontFamilies.display.semibold,
      fontSize: 24,
      lineHeight: 30,
      color: theme.colors.text.primary,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border.subtle,
      borderRadius: theme.radii.md,
      borderCurve: 'continuous',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surface.sunken,
    },
    searchInput: {
      flex: 1,
      ...theme.typography.body,
      color: theme.colors.text.primary,
      paddingVertical: 0,
      includeFontPadding: false,
    },
    clearVisible: {
      marginLeft: theme.spacing.sm,
      width: 'auto',
      overflow: 'visible',
    },
    clearHidden: {
      width: 0,
      overflow: 'hidden',
    },
    recentRow: {
      marginTop: theme.spacing.md,
    },
    recentRowContent: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingRight: theme.spacing.lg,
    },
    recentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.pill,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.brand.primarySoft,
    },
    recentChipIcon: {
      marginRight: 6,
    },
    recentChipText: {
      ...theme.typography.label,
      color: theme.colors.brand.primary,
    },
    suggestedRow: {
      marginTop: theme.spacing.md,
    },
    suggestedLabel: {
      fontFamily: theme.fontFamilies.ui.semibold,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.colors.text.muted,
      marginBottom: theme.spacing.sm,
    },
    suggestedRowContent: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingRight: theme.spacing.lg,
    },
    suggestedChip: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.pill,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border.subtle,
      backgroundColor: theme.colors.surface.raised,
    },
    suggestedChipIcon: {
      marginRight: 6,
    },
    suggestedChipText: {
      ...theme.typography.label,
      color: theme.colors.text.secondary,
    },
    exploreHint: {
      marginTop: theme.spacing.md,
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    exploreArrowTile: {
      width: EXPLORE_ARROW_SIZE,
      height: EXPLORE_ARROW_SIZE,
      borderRadius: 12,
      borderCurve: 'continuous',
      marginBottom: theme.spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.brand.primarySoft,
      overflow: 'hidden',
      position: 'relative',
    },
    exploreArrowFillMask: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      backgroundColor: theme.colors.brand.primary,
    },
    exploreArrowFillInner: {
      width: EXPLORE_ARROW_SIZE,
      height: EXPLORE_ARROW_SIZE,
      position: 'absolute',
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exploreLabel: {
      fontFamily: theme.fontFamilies.ui.medium,
      fontSize: 12,
      color: theme.colors.text.muted,
      textAlign: 'center',
    },
  });
