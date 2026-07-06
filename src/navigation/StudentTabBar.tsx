import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { palette, type Theme } from '../theme';
import { PressableScale } from '../components/ui';
import { haptics } from '../lib/haptics';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { navBlurTargetRef } from './navBlurTarget';
import { StudentTabsParamList } from './types';

type IconPair = [outline: keyof typeof Ionicons.glyphMap, filled: keyof typeof Ionicons.glyphMap];

const TAB_META: Record<keyof StudentTabsParamList, { label: string; icon: IconPair }> = {
  Dashboard: { label: 'Home', icon: ['home-outline', 'home'] },
  MyPapers: { label: 'Papers', icon: ['folder-open-outline', 'folder-open'] },
  Browse: { label: 'Browse', icon: ['search-outline', 'search'] },
  Profile: { label: 'Profile', icon: ['person-outline', 'person'] },
};

// Faithful port of the visual-direction mockup's `.navind` transition:
// `left .42s cubic-bezier(.34,1.3,.4,1)` — a spring-overshoot slide.
const INDICATOR_TIMING = {
  duration: 420,
  easing: Easing.bezier(0.34, 1.3, 0.4, 1),
};

// Inset the sliding pill from each tab's edges so it doesn't sit flush to the
// bar's inner wall (and leaves a gap between adjacent tabs).
const PILL_INSET = 8;

// Dark ink on the gold FAB (mockup ink-on-gold) — white read as poor contrast.
const FAB_INK = '#3A2600';

// Mockup's frosted bar: `background: var(--nav); backdrop-filter: blur(18px)`.
// expo-blur's `intensity` (1-100) isn't a literal px radius, so this is a
// chosen approximation, not a measured conversion — verify on-device against
// the mockup before treating it as final.
const BAR_BLUR_INTENSITY = 50;
// Android has no real blur without an explicit method (default renders a flat
// semi-transparent view per expo-blur's own docs); this is the SDK31+ native
// implementation with automatic fallback to 'none' on older devices — paired
// with `blurTarget` (below) so it doesn't actually hit that fallback.
const BAR_BLUR_METHOD = 'dimezisBlurViewSdk31Plus' as const;

// Mockup FAB fill: `linear-gradient(145deg, #F8C156, #F5A623)` — mode-invariant
// (the mockup hardcodes these hex stops regardless of light/dark). 145deg
// converted to expo-linear-gradient's normalized start/end points.
const FAB_GRADIENT_START = { x: 0.21, y: 0.09 };
const FAB_GRADIENT_END = { x: 0.79, y: 0.91 };

interface TabItemProps {
  routeName: keyof StudentTabsParamList;
  focused: boolean;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  styles: ReturnType<typeof makeStyles>;
  activeColor: string;
  inactiveColor: string;
}

/** A single tab: icon + label swap to navy when active (no scale — the moving pill carries the motion). */
const TabItem = ({
  routeName,
  focused,
  onPress,
  onLayout,
  styles,
  activeColor,
  inactiveColor,
}: TabItemProps) => {
  const meta = TAB_META[routeName];
  const color = focused ? activeColor : inactiveColor;

  return (
    <Pressable
      style={styles.tab}
      onLayout={onLayout}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
    >
      <Ionicons name={focused ? meta.icon[1] : meta.icon[0]} size={22} color={color} />
      <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
        {meta.label}
      </Text>
    </Pressable>
  );
};

/**
 * Custom floating student tab bar built to the visual-direction mockup: a
 * detached rounded bar with a navy-soft **pill that slides on a spring** behind
 * the active tab (replacing the old gold dot), four tabs split around a raised
 * gold squircle Submit FAB, and a bottom safe-area inset.
 */
export const StudentTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { theme, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReduceMotion();

  const activeColor = theme.colors.brand.primary;
  const inactiveColor = theme.colors.text.muted;

  const layouts = useRef<Record<number, { x: number; width: number }>>({});
  const indX = useSharedValue(0);
  const indW = useSharedValue(0);
  const [measured, setMeasured] = useState(false);

  const moveIndicator = useCallback(
    (index: number, animate: boolean) => {
      const layout = layouts.current[index];
      if (!layout) return;
      const x = layout.x + PILL_INSET;
      const width = layout.width - PILL_INSET * 2;
      if (animate) {
        indX.value = withTiming(x, INDICATOR_TIMING);
        indW.value = withTiming(width, INDICATOR_TIMING);
      } else {
        indX.value = x;
        indW.value = width;
      }
    },
    [indX, indW]
  );

  useEffect(() => {
    moveIndicator(state.index, measured && !reduceMotion);
  }, [state.index, measured, reduceMotion, moveIndicator]);

  const handleTabLayout = (index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    layouts.current[index] = { x, width };
    if (index === state.index) {
      moveIndicator(index, false);
      setMeasured(true);
    }
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indX.value }],
    width: indW.value,
  }));

  const onTabPress = (routeKey: string, routeName: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    haptics.light();
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName as never);
    }
  };

  const openSubmit = () => {
    navigation.getParent()?.navigate('SubmitResearch' as never);
  };

  const renderTab = (index: number) => {
    const route = state.routes[index];
    return (
      <TabItem
        key={route.key}
        routeName={route.name as keyof StudentTabsParamList}
        focused={state.index === index}
        onPress={() => onTabPress(route.key, route.name, state.index === index)}
        onLayout={(event) => handleTabLayout(index, event)}
        styles={styles}
        activeColor={activeColor}
        inactiveColor={inactiveColor}
      />
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom || theme.spacing.sm }]}>
      <View style={styles.barShadow}>
        <View style={styles.bar}>
          <BlurView
            intensity={BAR_BLUR_INTENSITY}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            blurMethod={BAR_BLUR_METHOD}
            blurTarget={navBlurTargetRef}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none" />

          {renderTab(0)}
          {renderTab(1)}
          <View style={styles.spacer} />
          {renderTab(2)}
          {renderTab(3)}
        </View>

        <View style={styles.fabSlot} pointerEvents="box-none">
          <PressableScale
            style={styles.fab}
            haptic="medium"
            scaleTo={0.9}
            onPress={openSubmit}
            accessibilityRole="button"
            accessibilityLabel="Submit research"
          >
            <LinearGradient
              colors={[palette.gold[300], palette.gold[500]]}
              start={FAB_GRADIENT_START}
              end={FAB_GRADIENT_END}
              style={styles.fabGradient}
              pointerEvents="none"
            />
            <Ionicons name="create-outline" size={26} color={FAB_INK} />
          </PressableScale>
        </View>
      </View>
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.sm,
      backgroundColor: 'transparent',
    },
    // Outer shadow container: iOS shadow rendering gets clipped by
    // `overflow: hidden`, so the shadow/elevation live here while the actual
    // frosted-glass clipping lives on the inner `bar`. The FAB slot is a
    // sibling of `bar` (not a child) so its `top: -20` overhang isn't clipped
    // by the inner view's `overflow: hidden`.
    barShadow: {
      height: 66,
      borderRadius: 26,
      borderCurve: 'continuous',
      backgroundColor: 'transparent',
      shadowColor: '#0B1B47',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.28,
      shadowRadius: 24,
      elevation: 12,
    },
    // Only the pill itself carries any surface (the BlurView + its own
    // `tint`) — no extra opaque fill behind it, so the bar reads as
    // genuinely floating rather than a solid card.
    bar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: 'transparent',
      // Mockup-exact radii — the floating detached bar.
      borderRadius: 26,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      overflow: 'hidden',
    },
    indicator: {
      position: 'absolute',
      left: 0,
      top: 9,
      height: 48,
      borderRadius: 20,
      borderCurve: 'continuous',
      backgroundColor: t.colors.brand.primarySoft,
      zIndex: 0,
    },
    tab: {
      flex: 1,
      height: '100%',
      zIndex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    tabLabel: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 10,
    },
    spacer: {
      width: 58,
    },
    fabSlot: {
      position: 'absolute',
      left: '50%',
      top: -20,
      marginLeft: -29,
      zIndex: 3,
    },
    fab: {
      width: 58,
      height: 58,
      borderRadius: 24,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      // Shadow values are mockup-exact (DESIGN.md) — unchanged by the A3
      // gradient-fill swap.
      shadowColor: t.colors.brand.accent,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 10,
    },
    // Real gold gradient fill (A3) — replaces the A1 solid-fill + sheen
    // approximation now that expo-linear-gradient is available.
    fabGradient: {
      ...StyleSheet.absoluteFill,
      borderRadius: 24,
      borderCurve: 'continuous',
    },
  });
