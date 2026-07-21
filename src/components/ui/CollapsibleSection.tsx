import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  LinearTransition,
  FadeInUp,
  FadeOutUp,
} from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Icon } from './Icon';

interface CollapsibleSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
  initiallyExpanded?: boolean;
}

export const CollapsibleSection = ({
  title,
  count,
  children,
  initiallyExpanded = true,
}: CollapsibleSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: withSpring(isExpanded ? '180deg' : '0deg', { damping: 14 }) }],
    };
  });

  return (
    <Animated.View layout={LinearTransition.springify().damping(16)} style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        </View>
        <Animated.View style={iconStyle}>
          <Icon icon={ChevronDown} size={20} color={theme.colors.text.secondary} />
        </Animated.View>
      </Pressable>

      {isExpanded ? (
        <Animated.View
          entering={FadeInUp.springify().damping(16)}
          exiting={FadeOutUp.springify().damping(16)}
        >
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      gap: t.spacing.md,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: t.spacing.xs,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
    },
    title: {
      ...t.typography.h3,
      color: t.colors.text.primary,
    },
    badge: {
      backgroundColor: t.colors.brand.primarySurface,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: t.radii.pill,
      minWidth: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      fontFamily: t.fontFamilies.ui.bold,
      fontSize: 12,
      color: t.colors.brand.primary,
    },
  });
