import { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { useReduceMotion } from '../../hooks/useReduceMotion';

interface SkeletonProps {
  height?: number;
  width?: DimensionValue;
  radius?: keyof Theme['radii'];
}

export const Skeleton = ({ height = 14, width = '100%', radius = 'sm' }: SkeletonProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const baseStyle = [styles.block, { height, width, borderRadius: theme.radii[radius] }];

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const half = theme.motion.skeletonCycleDuration / 2;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: half,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: half,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, reduceMotion, theme.motion.skeletonCycleDuration]);

  if (reduceMotion) {
    return <View style={[...baseStyle, { opacity: 0.6 }]} />;
  }

  return <Animated.View style={[...baseStyle, { opacity }]} />;
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    block: {
      backgroundColor: t.colors.surface.sunken,
    },
  });
