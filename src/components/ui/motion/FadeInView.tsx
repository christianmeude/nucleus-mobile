import { ReactNode, useEffect, useState } from 'react';
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
import { useReduceMotion } from '../../../hooks/useReduceMotion';

// Entrances decelerate into place (ease-out) per the ui-ux-pro-max ux rule
// ("ease-out for entering"); the default in-out curve read as clunky.
const ENTRANCE_EASING = Easing.out(Easing.cubic);

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
 *
 * While animating, the subtree is composited to a single hardware texture on
 * Android. Without it, children that cast `elevation` shadows leak a gray
 * "ghost" of the shadow at full strength while the wrapper's opacity is < 1
 * (the shadow ignores the ancestor's animated opacity). The flag is dropped
 * once the entrance settles so the crisp static shadow returns.
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
  const play = active && !reduceMotion;
  const progress = useSharedValue(play ? 0 : 1);
  const [rasterize, setRasterize] = useState(play);

  useEffect(() => {
    if (!play) {
      // rasterize already initialised to `play` (false) — nothing to animate.
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: ENTRANCE_EASING }, (finished) => {
        if (finished) runOnJS(setRasterize)(false);
      }),
    );
  }, [play, delay, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * distance },
      { scale: fromScale + (1 - fromScale) * progress.value },
    ],
  }));

  return (
    <Animated.View style={[style, animatedStyle]} renderToHardwareTextureAndroid={rasterize}>
      {children}
    </Animated.View>
  );
};
