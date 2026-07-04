import { ReactNode, useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '../../../theme';
import { useReduceMotion } from '../../../hooks/useReduceMotion';

interface FadeInViewProps {
  children: ReactNode;
  /** Delay before the entrance starts (ms). */
  delay?: number;
  /** Upward travel distance (px). Default `motion.entrance.distance`. */
  distance?: number;
  /** Entrance duration (ms). Default `motion.entrance.duration`. */
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Fade + rise entrance (Reanimated), wired to `motion.entrance` and respectful
 * of the OS "reduce motion" setting (renders the final state instantly when on).
 */
export const FadeInView = ({
  children,
  delay = 0,
  distance = motion.entrance.distance,
  duration = motion.entrance.duration,
  style,
}: FadeInViewProps) => {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(delay, withTiming(1, { duration }));
  }, [reduceMotion, delay, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * distance }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};
