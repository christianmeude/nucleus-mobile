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
  /**
   * Travel distance (px). Default `motion.entrance.distance`. A **positive**
   * value rises up from below; a **negative** value drops down from above (e.g.
   * a header entering from the top of the screen).
   */
  distance?: number;
  /** Entrance duration (ms). Default `motion.entrance.duration`. */
  duration?: number;
  /** Starting scale for a subtle "pop"; `1` (default) means no scaling. */
  fromScale?: number;
  /**
   * When `false`, render the final state instantly with no animation — used to
   * gate the entrance to a specific moment (e.g. only the first post-onboarding
   * mount) without changing the view tree.
   */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Fade + rise/drop (+ optional pop) entrance (Reanimated), wired to
 * `motion.entrance` and respectful of the OS "reduce motion" setting (renders
 * the final state instantly when on, or when `active` is false).
 */
export const FadeInView = ({
  children,
  delay = 0,
  distance = motion.entrance.distance,
  duration = motion.entrance.duration,
  fromScale = 1,
  active = true,
  style,
}: FadeInViewProps) => {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !active) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(delay, withTiming(1, { duration }));
  }, [reduceMotion, active, delay, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * distance },
      { scale: fromScale + (1 - fromScale) * progress.value },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};
