import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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

  const iconStyle = {
    transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
  };

  return (
    <View style={styles.container}>
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
        <View style={iconStyle}>
          <Icon icon={ChevronDown} size={20} color={theme.colors.text.secondary} />
        </View>
      </Pressable>

      <View style={!isExpanded ? { height: 0, opacity: 0, overflow: 'hidden' } : undefined}>
        {children}
      </View>
    </View>
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
      paddingHorizontal: t.spacing.sm,
      borderRadius: t.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      ...t.typography.caption,
      fontFamily: t.fontFamilies.ui.bold,
      color: t.colors.brand.primary,
    },
  });
