import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { PressableScale } from '../components/ui';
import { haptics } from '../lib/haptics';
import { useReduceMotion } from '../hooks/useReduceMotion';
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
  const { theme } = useTheme();
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
      if (animate) {
        indX.value = withTiming(layout.x, INDICATOR_TIMING);
        indW.value = withTiming(layout.width, INDICATOR_TIMING);
      } else {
        indX.value = layout.x;
        indW.value = layout.width;
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
      <View style={styles.bar}>
        <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none" />

        {renderTab(0)}
        {renderTab(1)}
        <View style={styles.spacer} />
        {renderTab(2)}
        {renderTab(3)}

        <View style={styles.fabSlot} pointerEvents="box-none">
          <PressableScale
            style={styles.fab}
            haptic="medium"
            scaleTo={0.9}
            onPress={openSubmit}
            accessibilityRole="button"
            accessibilityLabel="Submit research"
          >
            <Ionicons name="add" size={28} color={theme.colors.text.onBrand} />
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
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      height: 66,
      // Mockup-exact radii/shadow — the floating detached bar.
      borderRadius: 26,
      borderCurve: 'continuous',
      backgroundColor: t.colors.surface.raised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      overflow: 'visible',
      shadowColor: '#0B1B47',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.28,
      shadowRadius: 24,
      elevation: 12,
    },
    indicator: {
      position: 'absolute',
      left: 0,
      top: 9,
      height: 48,
      borderRadius: 16,
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
      borderRadius: 20,
      borderCurve: 'continuous',
      backgroundColor: t.colors.brand.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: t.colors.brand.accent,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 10,
    },
  });
