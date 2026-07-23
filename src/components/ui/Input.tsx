import { useEffect, useRef, useState, ElementType, forwardRef, useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { themes, type Theme } from '../../theme';
import { haptics } from '../../lib/haptics';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  /** Optional override for the container style */
  containerStyle?: StyleProp<ViewStyle>;
  /** Optional override for the input style */
  inputStyle?: StyleProp<TextStyle>;
  /** Error message to display, also triggers error styling and haptic */
  error?: string | null;
  /** React component to render as an icon (e.g., from lucide-react-native) */
  icon?: React.ReactNode;
  /** The underlying component to use. Defaults to React Native's TextInput. */
  component?: ElementType;
  /**
   * Force a specific theme variant. Useful for screens like Login that
   * are hardcoded to dark mode regardless of global app settings.
   */
  variant?: 'light' | 'dark';
  focusColor?: string;
}

/**
 * A smooth, theme-aware input primitive. Handles focus animations
 * (crossfading borders and backgrounds) and error haptics automatically.
 */
export const Input = forwardRef<any, InputProps>(
  (
    {
      containerStyle,
      inputStyle,
      error,
      icon,
      component: Component = TextInput,
      variant,
      focusColor,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const contextTheme = useTheme().theme;
    const activeTheme = variant ? themes[variant] : contextTheme;
    const [focused, setFocused] = useState(false);

    // Track previous error state to only fire haptic when transitioning TO an error
    const prevError = useRef(error);

    useEffect(() => {
      if (error && !prevError.current) {
        haptics.error();
      }
      prevError.current = error;
    }, [error]);

    const handleFocus = (e: any) => {
      setFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setFocused(false);
      onBlur?.(e);
    };

    const animatedWrapperStyle = useAnimatedStyle(() => {
      // Colors are resolved from the active theme
      const borderColor = error
        ? activeTheme.colors.state.danger
        : focused
          ? focusColor || activeTheme.colors.brand.accent
          : variant === 'dark'
            ? 'rgba(255, 255, 255, 0.2)'
            : activeTheme.colors.border.strong;

      const backgroundColor = error
        ? activeTheme.colors.state.dangerSurface
        : focused
          ? variant === 'dark'
            ? 'rgba(255, 255, 255, 0.12)'
            : activeTheme.colors.surface.raised
          : variant === 'dark'
            ? 'rgba(255, 255, 255, 0.08)'
            : activeTheme.colors.surface.base;

      return {
        borderColor: withTiming(borderColor, { duration: 200 }),
        backgroundColor: withTiming(backgroundColor, { duration: 200 }),
      };
    });

    const AnimatedComponent = useMemo(
      () => Animated.createAnimatedComponent(Component as any),
      [Component],
    );

    const styles = makeStyles(activeTheme, variant);

    return (
      <Animated.View style={[styles.inputWrap, animatedWrapperStyle, containerStyle]}>
        {icon ? <View style={styles.inputIcon}>{icon}</View> : null}
        <AnimatedComponent
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={
            variant === 'dark' ? 'rgba(255, 255, 255, 0.4)' : activeTheme.colors.text.disabled
          }
          style={[styles.input, inputStyle]}
          {...rest}
        />
      </Animated.View>
    );
  },
);

const makeStyles = (t: Theme, variant?: 'light' | 'dark') =>
  StyleSheet.create({
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      paddingHorizontal: t.spacing.md,
      overflow: 'hidden',
    },
    inputIcon: {
      marginRight: t.spacing.sm,
      zIndex: 2,
    },
    input: {
      flex: 1,
      paddingVertical: t.spacing.md,
      ...t.typography.body,
      color: variant === 'dark' ? t.colors.text.onBrand : t.colors.text.primary,
      zIndex: 2,
    },
  });
