import { ReactNode, useEffect, useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '../../../theme';
import { useReduceMotion } from '../../../hooks/useReduceMotion';

interface AtomicListPaintProps {
  /** True once the first non-empty batch of rows is ready to paint. */
  ready: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Group entrance for a list's first data commit.
 *
 * The wrapper is stable: it animates its own opacity instead of keying a
 * `FadeInView`, because remounting here would tear down the `LegendList` child
 * at the exact moment the list's own `listEpochKey` remount lands — two list
 * reconstructions in one commit. The hidden skeleton stays at full opacity;
 * when rows land, the whole batch fades in as one motion (opacity only, no
 * per-row stagger).
 *
 * The effect depends only on the play state (`ready` and reduced motion), so
 * pagination, pull-to-refresh, and SWR revalidation (which keep `ready` true)
 * do not replay the fade. While the animation runs the subtree is composited
 * to a single hardware texture on Android — the same elevation-shadow ghost
 * workaround `FadeInView` uses.
 */
export const AtomicListPaint = ({ ready, children, style }: AtomicListPaintProps) => {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(1);
  const play = ready && !reduceMotion;
  const [rasterize, setRasterize] = useState(play);
  const [wasPlaying, setWasPlaying] = useState(play);

  // Turn the Android texture on during the render that starts the fade, so the
  // very first animated frame is already composited. Adjusting state during
  // render is the supported pattern for deriving state from props.
  if (play !== wasPlaying) {
    setWasPlaying(play);
    setRasterize(play);
  }

  useEffect(() => {
    if (!play) {
      opacity.value = 1;
      return;
    }

    opacity.value = 0;
    opacity.value = withTiming(
      1,
      { duration: motion.duration.listPaint, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setRasterize)(false);
      },
    );
  }, [play, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[style, animatedStyle]} renderToHardwareTextureAndroid={rasterize}>
      {children}
    </Animated.View>
  );
};
