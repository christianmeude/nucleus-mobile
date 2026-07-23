import { ReactNode } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { motion } from '../../../theme';
import { haptics } from '../../../lib/haptics';

type HapticKind = 'none' | 'light' | 'medium';

interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Haptic fired on press-in. Default 'light'; 'none' to disable. */
  haptic?: HapticKind;
  /** Scale applied while pressed. Default `motion.pressScale` (0.97). */
  scaleTo?: number;
}

/**
 * Pressable with a spring press-scale (Reanimated) + optional haptic. Replaces
 * ad-hoc `pressed && { transform: [{ scale }] }` styling. The visual box (its
 * `style`) scales; the Pressable is the touch target wrapping it.
 */
export const PressableScale = ({
  children,
  style,
  haptic = 'light',
  scaleTo = motion.pressScale,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    scale.value = withSpring(scaleTo, motion.spring.press);
    if (haptic !== 'none' && !disabled) haptics[haptic]();
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    scale.value = withSpring(1, motion.spring.press);
    onPressOut?.(event);
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled} {...rest}>
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
};
