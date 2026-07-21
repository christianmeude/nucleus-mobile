import { useMemo } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ArrowUp, Clock, Search, TrendingUp } from 'lucide-react-native';
import { Chip, Icon, PressableScale } from '../../../components/ui';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
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
  greeting: string;
  greetingStyle: StyleProp<TextStyle>;
  query: string;
  setQuery: (text: string) => void;
  submitSearch: () => void;
  clearSearch: () => void;
  searched: boolean;
  showClear: boolean;
  recent: string[];
  runSearch: (term: string) => void;
  onExploreCommit: () => void;
  reducedMotion: boolean;
}

export const BrowseHeader = ({
  greeting,
  greetingStyle,
  query,
  setQuery,
  submitSearch,
  clearSearch,
  searched,
  showClear,
  recent,
  runSearch,
  onExploreCommit,
  reducedMotion,
}: BrowseHeaderProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const exploreFill = useSharedValue(0);
  const explorePop = useSharedValue(1);

  const exploreGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          const travelled = Math.max(0, -event.translationY);
          exploreFill.value = Math.min(1, travelled / EXPLORE_DRAG_DISTANCE);
        })
        .onEnd(() => {
          const committed = exploreFill.value >= EXPLORE_COMMIT_THRESHOLD;
          if (committed) {
            if (reducedMotion) {
              exploreFill.value = 1;
            } else {
              exploreFill.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
              explorePop.value = withSequence(
                withTiming(1.3, { duration: 110, easing: Easing.out(Easing.quad) }),
                withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
              );
            }
            runOnJS(onExploreCommit)();
          } else if (reducedMotion) {
            exploreFill.value = 0;
          } else {
            exploreFill.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
          }
        }),
    [exploreFill, explorePop, onExploreCommit, reducedMotion],
  );

  const explorePopStyle = useAnimatedStyle(() => ({
    transform: [{ scale: explorePop.value }],
  }));
  const exploreFillStyle = useAnimatedStyle(() => ({
    height: exploreFill.value * EXPLORE_ARROW_SIZE,
  }));

  return (
    <View style={styles.headerBlock}>
      <Animated.Text style={[styles.greeting, greetingStyle]} pointerEvents="none">
        {greeting}
      </Animated.Text>

      <View style={styles.searchWrap}>
        <Icon icon={Search} size={18} color={theme.colors.text.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submitSearch}
          returnKeyType="search"
          placeholder="Search papers, authors, keywords"
          placeholderTextColor={theme.colors.text.disabled}
          style={styles.searchInput}
          accessibilityLabel="Search papers"
          accessibilityHint="Filters published papers by title, author, or keyword"
        />
        <View
          pointerEvents={showClear ? 'auto' : 'none'}
          style={showClear ? styles.clearVisible : styles.clearHidden}
        >
          <Chip label="Clear" active={false} onPress={clearSearch} variant="filter" />
        </View>
      </View>

      {!searched && recent.length > 0 ? (
        <Animated.View style={[styles.recentRow, greetingStyle]} pointerEvents="box-none">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentRowContent}
            keyboardShouldPersistTaps="handled"
          >
            {recent.map((term, index) => (
              <PressableScale
                key={term}
                style={styles.recentChip}
                onPress={() => runSearch(term)}
                accessibilityRole="button"
                accessibilityLabel={`Search recent: ${term}`}
              >
                {index === 0 ? (
                  <Icon
                    icon={Clock}
                    size={14}
                    color={theme.colors.brand.primary}
                    style={styles.recentChipIcon}
                  />
                ) : null}
                <Text style={styles.recentChipText}>{term}</Text>
              </PressableScale>
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}

      {!searched ? (
        <Animated.View style={[styles.suggestedRow, greetingStyle]} pointerEvents="box-none">
          <Text style={styles.suggestedLabel}>Popular searches</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestedRowContent}
            keyboardShouldPersistTaps="handled"
          >
            {SUGGESTED_SEARCHES.map((term) => (
              <PressableScale
                key={term}
                style={styles.suggestedChip}
                onPress={() => runSearch(term)}
                accessibilityRole="button"
                accessibilityLabel={`Search suggested: ${term}`}
              >
                <Icon
                  icon={TrendingUp}
                  size={13}
                  color={theme.colors.text.secondary}
                  style={styles.suggestedChipIcon}
                />
                <Text style={styles.suggestedChipText}>{term}</Text>
              </PressableScale>
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}

      {!searched ? (
        <GestureDetector gesture={exploreGesture}>
          <Animated.View style={[styles.exploreHint, greetingStyle]}>
            <Animated.View style={[styles.exploreArrowTile, explorePopStyle]}>
              <Icon icon={ArrowUp} size={18} color={theme.colors.brand.primary} />
              <Animated.View
                style={[styles.exploreArrowFillMask, exploreFillStyle]}
                pointerEvents="none"
              >
                <View style={styles.exploreArrowFillInner}>
                  <Icon icon={ArrowUp} size={18} color={theme.colors.text.onBrand} />
                </View>
              </Animated.View>
            </Animated.View>
            <Text style={styles.exploreLabel}>Swipe up to browse papers</Text>
          </Animated.View>
        </GestureDetector>
      ) : null}
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    headerBlock: {
      position: 'relative',
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
