import React, { useEffect } from 'react';
import { DimensionValue, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import { type Theme } from '../../../theme';
import { useReduceMotion } from '../../../hooks/useReduceMotion';

interface ShimmerSkeletonProps {
  height?: number;
  width?: DimensionValue;
  radius?: keyof Theme['radii'];
}

export const ShimmerSkeleton = ({
  height = 14,
  width = '100%',
  radius = 'sm',
}: ShimmerSkeletonProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    progress.value = withRepeat(
      withTiming(1, { duration: theme.motion.skeletonCycleDuration, easing: Easing.linear }),
      -1,
      false
    );
  }, [progress, reduceMotion, theme.motion.skeletonCycleDuration]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: `${interpolate(progress.value, [0, 1], [-100, 100])}%`,
        },
      ],
    };
  });

  const baseStyle = [styles.block, { height, width, borderRadius: theme.radii[radius] }];

  if (reduceMotion) {
    return <View style={[baseStyle, { opacity: 0.6 }]} />;
  }

  return (
    <View style={[baseStyle, styles.overflowHidden]}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0)',
            'rgba(255, 255, 255, 0.4)',
            'rgba(255, 255, 255, 0)',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    block: {
      backgroundColor: t.colors.surface.sunken,
    },
    overflowHidden: {
      overflow: 'hidden',
    },
  });
