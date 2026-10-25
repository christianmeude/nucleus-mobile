import React, { useLayoutEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { themes } from '../../theme';
import { useReduceMotion } from '../../hooks/useReduceMotion';

/**
 * Fullscreen smooth ease dissolve overlay for theme changes.
 * When the scheme changes, this overlay holds the previous scheme's surface color
 * and smoothly eases out from 0.85 to 0 over 350ms, producing a seamless, premium crossfade
 * between light and dark modes.
 */
export const ThemeTransitionOverlay = () => {
  const { scheme } = useTheme();
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0);
  const prevScheme = useRef(scheme);
  const isFirstMount = useRef(true);

  useLayoutEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      prevScheme.current = scheme;
      return;
    }

    if (prevScheme.current === scheme) return;
    prevScheme.current = scheme;

    if (reduceMotion) return;

    // Display previous theme surface and dissolve smoothly into the new theme
    opacity.value = 0.85;
    opacity.value = withTiming(0, {
      duration: 350,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [scheme, reduceMotion, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // The overlay displays the previous scheme surface color while dissolving.
  // Because scheme is strictly 'light' | 'dark', the transition origin is the opposite scheme.
  const fromScheme = scheme === 'dark' ? 'light' : 'dark';
  const overlayBg = themes[fromScheme].colors.surface.base;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: overlayBg,
          zIndex: 9999,
        },
        style,
      ]}
    />
  );
};
