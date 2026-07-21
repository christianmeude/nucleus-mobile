import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView, SFSymbol } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';
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
import { FadeInView, PressableScale } from '../components/ui';
import { haptics } from '../lib/haptics';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useCoachmarkTarget } from '../components/coachmarks/CoachmarkProvider';
import { type CoachmarkId } from '../components/coachmarks/sequence';
import { isFirstEntranceArmed } from '../lib/firstEntrance';

export type IconPair = [outline: SFSymbol, filled: SFSymbol, lucideIcon: LucideIcon];

/**
 * Per-tab label + outline/filled icon pair, keyed by route name. An optional
 * `coachmarkId` registers that tab as a first-run coachmark target (#69) — the
 * student bar maps it on Browse; the faculty bar leaves it unset, so nothing
 * registers there.
 */
export type TabMeta = Record<string, { label: string; icon: IconPair; coachmarkId?: CoachmarkId }>;

/** Optional raised center action (student Submit FAB). When absent, tabs fill the bar evenly. */
export interface FabConfig {
  icon: SFSymbol;
  lucideIcon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
}

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

// FAB fill: a **vertical** light→deep gold gradient (top-lit). Combined with the
// gloss overlay + bevel rim + grounded shadow below, the button reads as a
// convex, solid 3D control centered in the bar — not a flat overhanging chip.
const FAB_GRADIENT_START = { x: 0.5, y: 0 };
const FAB_GRADIENT_END = { x: 0.5, y: 1 };

interface TabItemProps {
  routeName: string;
  meta: TabMeta[string];
  focused: boolean;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  styles: ReturnType<typeof makeStyles>;
  activeColor: string;
  inactiveColor: string;
}

/** A single tab: icon + label swap to navy when active (no scale — the moving pill carries the motion). */
const TabItem = ({
  meta,
  focused,
  onPress,
  onLayout,
  styles,
  activeColor,
  inactiveColor,
}: TabItemProps) => {
  const color = focused ? activeColor : inactiveColor;
  // No-op unless this tab carries a coachmarkId (student Browse tab, #69).
  const coachmarkRef = useCoachmarkTarget(meta.coachmarkId);

  return (
    <Pressable
      ref={coachmarkRef}
      style={styles.tab}
      onLayout={onLayout}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
    >
      <SymbolView 
        name={focused ? meta.icon[1] : meta.icon[0]} 
        size={22} 
        tintColor={color} 
        fallback={
          (() => {
            const FallbackIcon = meta.icon[2];
            return <FallbackIcon size={22} color={color} />;
          })()
        } 
      />
      <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
        {meta.label}
      </Text>
    </Pressable>
  );
};

interface FloatingTabBarProps extends BottomTabBarProps {
  /** Label + icon pair per route name. Route names come from `state.routes`. */
  tabMeta: TabMeta;
  /** When provided, tabs split around a raised center FAB; when omitted, they fill evenly. */
  fab?: FabConfig;
}

/**
 * Shared floating tab bar built to the visual-direction mockup: a detached
 * rounded frosted bar with a navy-soft **pill that slides on a spring** behind
 * the active tab, and a bottom safe-area inset. Both roles render this one
 * primitive — the student passes a `fab` (the gold Submit button, a solid 3D
 * control centered in the bar, tabs split 2/2 around it); the faculty bar omits
 * it (four tabs, evenly spaced).
 * Keeping the blur/pill/motion in one place is what stops the two bars from
 * drifting apart (the failure mode PR #54 had to fix once, for one bar).
 */
export const FloatingTabBar = ({ state, navigation, tabMeta, fab }: FloatingTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { theme, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReduceMotion();

  const activeColor = theme.colors.brand.primary;
  const inactiveColor = theme.colors.text.muted;
  // First-run coachmark target (#69): only the student bar renders a FAB, so
  // this registers the Submit FAB for students and is inert for the faculty bar.
  const fabCoachmarkRef = useCoachmarkTarget('submitFab');
  // One-time "assemble" entrance: the bar slides up on the first launch straight
  // out of onboarding (armed there, student-only), static otherwise.
  const [assemble] = useState(isFirstEntranceArmed);

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

  const renderTab = (index: number) => {
    const route = state.routes[index];
    return (
      <TabItem
        key={route.key}
        routeName={route.name}
        meta={tabMeta[route.name]}
        focused={state.index === index}
        onPress={() => onTabPress(route.key, route.name, state.index === index)}
        onLayout={(event) => handleTabLayout(index, event)}
        styles={styles}
        activeColor={activeColor}
        inactiveColor={inactiveColor}
      />
    );
  };

  // With a FAB, tabs split evenly around a center gap (mockup: 2 | FAB | 2);
  // without one, they fill the bar. Splitting at the midpoint generalizes the
  // student bar's hardcoded 0,1,·,2,3 to any even tab count.
  const mid = Math.floor(state.routes.length / 2);
  const items: ReactNode[] = [];
  state.routes.forEach((_route, index) => {
    if (fab && index === mid) {
      items.push(<View key="fab-spacer" style={styles.spacer} />);
    }
    items.push(renderTab(index));
  });

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
        <View style={styles.bar}>
          <BlurView
            intensity={BAR_BLUR_INTENSITY}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.barTint} pointerEvents="none" />
          <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none" />

          {items}
        </View>

        {fab ? (
          <View ref={fabCoachmarkRef} style={styles.fabSlot} pointerEvents="box-none">
            <PressableScale
              style={styles.fab}
              haptic="medium"
              scaleTo={0.92}
              onPress={fab.onPress}
              accessibilityRole="button"
              accessibilityLabel={fab.accessibilityLabel}
            >
              <LinearGradient
                colors={[palette.gold[200], palette.gold[500]]}
                start={FAB_GRADIENT_START}
                end={FAB_GRADIENT_END}
                style={styles.fabGradient}
                pointerEvents="none"
              />
              {/* Top-lit specular gloss — the convex sheen of a solid 3D button. */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.45)', 'rgba(255, 255, 255, 0)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.fabGloss}
                pointerEvents="none"
              />
              <SymbolView 
                name={fab.icon} 
                size={30} 
                tintColor={FAB_INK} 
                fallback={
                  (() => {
                    const FabIcon = fab.lucideIcon;
                    return <FabIcon size={30} color={FAB_INK} />;
                  })()
                } 
              />
            </PressableScale>
          </View>
        ) : null}
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
      shadowColor: '#0B1B47',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.28,
      shadowRadius: 24,
      elevation: 12,
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
    // Centered vertically in the 66px bar (was `top: -20` overhang). The FAB no
    // longer lifts above the bar — it sits as a solid button within it.
    fabSlot: {
      position: 'absolute',
      left: '50%',
      top: 4,
      marginLeft: -29,
      zIndex: 3,
    },
    fab: {
      width: 58,
      height: 58,
      borderRadius: 22,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      // Bevel rim + grounded deep-gold shadow give the solid button its 3D depth.
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.5)',
      shadowColor: '#4A3800',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
      elevation: 12,
    },
    // Deep→light gold base fill (top-lit vertical gradient).
    fabGradient: {
      ...StyleSheet.absoluteFill,
      borderRadius: 22,
      borderCurve: 'continuous',
    },
    // Specular gloss over the top half — the convex sheen of a solid button.
    fabGloss: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '55%',
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderCurve: 'continuous',
    },
  });
