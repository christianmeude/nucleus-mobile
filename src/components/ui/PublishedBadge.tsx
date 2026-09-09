import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import type { Theme } from '../../theme';
import { CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export interface PublishedBadgeProps {
  /** 'sm' is sized for compact card rows ('md' is the detail-screen badge). */
  size?: 'sm' | 'md';
}

/**
 * Formal-publication badge: navy→deep-navy gradient with a gold hairline and
 * gold mark — deliberately a step above the success-green Approved tone.
 * White label on navy keeps contrast in both schemes through tokens alone.
 */
export const PublishedBadge = ({ size = 'md' }: PublishedBadgeProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const small = size === 'sm';

  return (
    <LinearGradient
      colors={[theme.colors.brand.primary, theme.colors.brand.primaryPressed]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, small && styles.badgeSm]}
    >
      <CheckCircle
        size={small ? 10 : 12}
        color={theme.colors.brand.accent}
        strokeWidth={3}
        style={[styles.icon, small && styles.iconSm]}
      />
      <Text style={[styles.label, small && styles.labelSm, { color: theme.colors.text.onBrand }]}>
        PUBLISHED
      </Text>
    </LinearGradient>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderCurve: 'continuous',
      alignSelf: 'flex-start',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.brand.accent,
    },
    badgeSm: {
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    icon: {
      marginRight: 5,
    },
    iconSm: {
      marginRight: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    labelSm: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
  });
