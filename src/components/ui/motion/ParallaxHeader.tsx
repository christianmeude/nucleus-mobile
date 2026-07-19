import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useReduceMotion } from '../../../hooks/useReduceMotion';

interface ParallaxHeaderProps {
  /** The content to be rendered as the parallax header */
  headerContent: ReactNode;
  /** Height of the header */
  headerHeight: number;
  /** The scrolling content below the header */
  children: ReactNode;
  /** Style for the scroll view container */
  style?: StyleProp<ViewStyle>;
  /** Optional background color for the scroll view */
  backgroundColor?: string;
}

/**
 * A layout wrapper that creates a parallax effect for a header behind scrolling content.
 * Respects OS reduced motion settings.
 */
export const ParallaxHeader = ({
  headerContent,
  headerHeight,
  children,
  style,
  backgroundColor,
}: ParallaxHeaderProps) => {
  const reduceMotion = useReduceMotion();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return {};
    }
    return {
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [-headerHeight, 0, headerHeight],
            [-headerHeight / 2, 0, headerHeight * 0.75],
            Extrapolation.CLAMP
          ),
        },
        {
          scale: interpolate(
            scrollY.value,
            [-headerHeight, 0, headerHeight],
            [2, 1, 1],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  return (
    <View style={[styles.container, style, backgroundColor ? { backgroundColor } : undefined]}>
      <Animated.View style={[styles.headerContainer, { height: headerHeight }, headerAnimatedStyle]}>
        {headerContent}
      </Animated.View>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: headerHeight }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
});
