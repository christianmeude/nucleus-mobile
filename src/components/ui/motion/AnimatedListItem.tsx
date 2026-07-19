import React, { ReactNode, useEffect, useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '../../../theme';
import { useReducedMotion } from 'react-native-reanimated';

const ENTRANCE_EASING = Easing.out(Easing.cubic);

interface AnimatedListItemProps {
  children: ReactNode;
  /** Index in the list, used to calculate stagger delay */
  index: number;
  /** Base delay before the first item enters (ms) */
  baseDelay?: number;
  /** Stagger delay per item (ms) */
  stagger?: number;
  /** Travel distance for the entrance */
  distance?: number;
  /** Entrance duration (ms) */
  duration?: number;
  /** Controls if the animation should play */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A wrapper for list items that animates in (fade and rise) when mounted.
 * Calculates entrance delay based on the item index.
 * Respects OS reduced motion settings.
 */
export const AnimatedListItem = ({
  children,
  index,
  baseDelay = 0,
  stagger = motion.entrance.stagger,
  distance = motion.entrance.distance,
  duration = motion.entrance.duration,
  active = true,
  style,
}: AnimatedListItemProps) => {
  const reduceMotion = useReducedMotion();
  const play = active && !reduceMotion;
  const progress = useSharedValue(play ? 0 : 1);
  const [rasterize, setRasterize] = useState(play);

  useEffect(() => {
    if (!play) {
      progress.value = 1;
      return;
    }
    const delay = baseDelay + index * stagger;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: ENTRANCE_EASING }, (finished) => {
        if (finished) runOnJS(setRasterize)(false);
      }),
    );
  }, [play, baseDelay, index, stagger, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * distance }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]} renderToHardwareTextureAndroid={rasterize}>
      {children}
    </Animated.View>
  );
};
