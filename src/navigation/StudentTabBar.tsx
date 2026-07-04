import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { motion, type Theme } from '../theme';
import { PressableScale } from '../components/ui';
import { haptics } from '../lib/haptics';
import { StudentTabsParamList } from './types';

type IconPair = [outline: keyof typeof Ionicons.glyphMap, filled: keyof typeof Ionicons.glyphMap];

const TAB_META: Record<keyof StudentTabsParamList, { label: string; icon: IconPair }> = {
  Dashboard: { label: 'Home', icon: ['home-outline', 'home'] },
  MyPapers: { label: 'My Papers', icon: ['folder-open-outline', 'folder-open'] },
  Browse: { label: 'Browse', icon: ['search-outline', 'search'] },
  Profile: { label: 'Profile', icon: ['person-outline', 'person'] },
};

interface TabItemProps {
  routeName: keyof StudentTabsParamList;
  focused: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  activeColor: string;
  inactiveColor: string;
}

/** One tab: springy icon lift + fill/color swap on focus, replacing the old gold dot. */
const TabItem = ({ routeName, focused, onPress, styles, activeColor, inactiveColor }: TabItemProps) => {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, motion.spring.gentle);
  }, [focused, progress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.12 }, { translateY: -progress.value * 2 }],
  }));

  const meta = TAB_META[routeName];
  const color = focused ? activeColor : inactiveColor;

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
    >
      <Animated.View style={iconStyle}>
        <Ionicons name={focused ? meta.icon[1] : meta.icon[0]} size={22} color={color} />
      </Animated.View>
      <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
        {meta.label}
      </Text>
    </Pressable>
  );
};

/**
 * Custom floating student tab bar: four tabs split around a raised center
 * Submit FAB. Sits in normal flow (content never overlaps it) with a bottom
 * safe-area inset so it no longer crowds the screen edge.
 */
export const StudentTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const activeColor = theme.colors.brand.primary;
  const inactiveColor = theme.colors.text.muted;

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
        styles={styles}
        activeColor={activeColor}
        inactiveColor={inactiveColor}
      />
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom || theme.spacing.sm }]}>
      <View style={styles.bar}>
        {renderTab(0)}
        {renderTab(1)}
        <View style={styles.fabSlot}>
          <PressableScale
            style={styles.fab}
            haptic="medium"
            onPress={openSubmit}
            accessibilityRole="button"
            accessibilityLabel="Submit research"
          >
            <Ionicons name="add" size={28} color={theme.colors.text.onBrand} />
          </PressableScale>
        </View>
        {renderTab(2)}
        {renderTab(3)}
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
      height: 64,
      paddingHorizontal: t.spacing.sm,
      borderRadius: t.radii.xl,
      borderCurve: 'continuous',
      backgroundColor: t.colors.surface.raised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      overflow: 'visible',
      ...t.shadows.level2,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      paddingVertical: t.spacing.xs,
    },
    tabLabel: {
      fontFamily: t.fontFamilies.ui.medium,
      fontSize: 11,
    },
    fabSlot: {
      width: 64,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
      backgroundColor: t.colors.brand.accent,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ translateY: -14 }],
      shadowColor: t.colors.brand.accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
    },
  });
