import { useCallback, useMemo, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { BlurView } from 'expo-blur';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { FadeInView, Icon } from '../components/ui';
import { haptics } from '../lib/haptics';
import { useCoachmarkTarget } from '../components/coachmarks/CoachmarkProvider';
import { type CoachmarkId } from '../components/coachmarks/sequence';
import { isFirstEntranceArmed } from '../lib/firstEntrance';

/**
 * Per-tab label + icon pair, keyed by route name. An optional
 * `coachmarkId` registers that tab as a first-run coachmark target (#69) — the
 * student bar maps it on Browse; the faculty bar leaves it unset, so nothing
 * registers there.
 */
export type TabMeta = Record<
  string,
  { label: string; icon: LucideIcon; coachmarkId?: CoachmarkId }
>;

// Inset the sliding pill from each tab's edges so it doesn't sit flush to the
// bar's inner wall (and leaves a gap between adjacent tabs).
const PILL_INSET = 8;

// Mockup's frosted bar: `background: var(--nav) /* ~93% opaque */;
// backdrop-filter: blur(18px)`. expo-blur's `intensity` (1-100) isn't a literal
// px radius, so this is a chosen approximation, not a measured conversion —
// verify on-device against the mockup before treating it as final.
const BAR_BLUR_INTENSITY = 50;
// Android has no real blur without an explicit method (default renders a flat
// semi-transparent view per expo-blur's own docs); this is the SDK31+ native
// implementation with automatic fallback to 'none' on older devices.
// Near-opaque tint over the blur, matching the mockup's `--nav` alpha (~0.93)
// so the bar reads as frosted-but-legible rather than a see-through pane.
const BAR_TINT_OPACITY = 0.9;

interface TabItemProps {
  meta: TabMeta[string];
  focused: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  activeColor: string;
  inactiveColor: string;
}

/** A single tab: icon + label swap to navy when active (no scale — the moving pill carries the motion). */
const TabItem = ({ meta, focused, onPress, styles, activeColor, inactiveColor }: TabItemProps) => {
  const color = focused ? activeColor : inactiveColor;
  // No-op unless this tab carries a coachmarkId (student Browse tab, #69).
  const coachmarkRef = useCoachmarkTarget(meta.coachmarkId);

  return (
    <Pressable
      ref={coachmarkRef}
      style={styles.tab}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
    >
      <Icon icon={meta.icon} size={22} color={color} />
      <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
        {meta.label}
      </Text>
    </Pressable>
  );
};

interface FloatingTabBarProps extends MaterialTopTabBarProps {
  /** Label + icon pair per route name. Route names come from `state.routes`. */
  tabMeta: TabMeta;
}

/**
 * Shared floating tab bar built to the visual-direction mockup: a detached
 * rounded frosted bar with a navy-soft **pill that tracks the pager** behind
 * the active tab, and a bottom safe-area inset. Both roles render this one
 * primitive (four tabs, evenly spaced).
 * Keeping the blur/pill/motion in one place is what stops the two bars from
 * drifting apart (the failure mode PR #54 had to fix once, for one bar).
 *
 * The pill is driven by the pager's own `position` node, so it follows the
 * finger 1:1 and settles with the page animation. It is deliberately not a
 * timing animation: there is no overshoot on tap anymore.
 */
export const FloatingTabBar = ({
  state,
  navigation,
  tabMeta,
  position,
  jumpTo,
}: FloatingTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { theme, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // One-time "assemble" entrance: the bar slides up on the first launch straight
  // out of onboarding (armed there, student-only), static otherwise.
  const [assemble] = useState(isFirstEntranceArmed);
  const [barWidth, setBarWidth] = useState(0);

  const activeColor = theme.colors.brand.primary;
  const inactiveColor = theme.colors.text.muted;

  // Tabs are flex:1 and equal width, so the pill geometry is continuous.
  const tabWidth = state.routes.length > 0 ? barWidth / state.routes.length : 0;

  const translateX = useMemo(
    () =>
      position.interpolate({
        inputRange: state.routes.map((_, index) => index),
        outputRange: state.routes.map((_, index) => index * tabWidth),
        extrapolate: 'clamp',
      }),
    [position, state.routes.length, tabWidth],
  );

  const handleBarLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setBarWidth((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
  }, []);

  const onTabPress = (routeKey: string, focused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
      data: {
        behavior: { scrollToTop: focused, popToTop: focused },
      },
    });
    haptics.light();
    // jumpTo is the pager's own key→index path: it animates the page and
    // dispatches onIndexChange, exactly like tab-view's default TabBar.
    if (!event.defaultPrevented) {
      jumpTo(routeKey);
    }
  };

  return (
    <FadeInView
      active={assemble}
      distance={30}
      duration={460}
      fromScale={0.94}
      delay={250}
      style={[styles.wrap, { paddingBottom: insets.bottom || theme.spacing.sm }]}
    >
      <View style={styles.barShadow}>
        <View style={styles.bar} onLayout={handleBarLayout}>
          <BlurView
            intensity={BAR_BLUR_INTENSITY}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.barTint} pointerEvents="none" />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              {
                width: Math.max(0, tabWidth - PILL_INSET * 2),
                opacity: tabWidth > 0 ? 1 : 0,
                transform: [{ translateX }],
              },
            ]}
          />

          {state.routes.map((route, index) => {
            const focused = state.index === index;
            return (
              <TabItem
                key={route.key}
                meta={tabMeta[route.name]}
                focused={focused}
                onPress={() => onTabPress(route.key, focused)}
                styles={styles}
                activeColor={activeColor}
                inactiveColor={inactiveColor}
              />
            );
          })}
        </View>
      </View>
    </FadeInView>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      bottom: t.spacing.md,
      left: 0,
      right: 0,
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.sm,
      backgroundColor: 'transparent',
      // The bar is a sibling drawn over the pager; the shadow elevation already
      // helps on Android, this is belt-and-braces.
      zIndex: 10,
    },
    // Outer shadow container: iOS shadow rendering gets clipped by
    // `overflow: hidden`, so the shadow/elevation live here while the actual
    // frosted-glass clipping lives on the inner `bar`. The FAB slot is a
    // sibling of `bar` (not a child) so the FAB — and its own drop shadow —
    // aren't clipped by the inner view's `overflow: hidden`.
    barShadow: {
      height: 66,
      borderRadius: 26,
      borderCurve: 'continuous',
      ...t.shadows.tinted.primary,
    },
    bar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      // Mockup-exact radii — the floating detached bar.
      borderRadius: 26,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      overflow: 'hidden',
    },
    // Near-opaque tint layered over the BlurView so the frosted bar reads in
    // the app's own surface color rather than the system default tint.
    barTint: {
      ...StyleSheet.absoluteFill,
      backgroundColor: t.colors.surface.raised,
      opacity: BAR_TINT_OPACITY,
    },
    indicator: {
      position: 'absolute',
      left: PILL_INSET,
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
  });
