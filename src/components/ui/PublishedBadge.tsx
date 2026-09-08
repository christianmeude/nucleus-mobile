import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import type { Theme } from '../../theme';
import { CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Formal-publication badge: navy→deep-navy gradient with a gold hairline and
 * gold mark — deliberately a step above the success-green Approved tone.
 * White label on navy keeps contrast in both schemes through tokens alone.
 */
export const PublishedBadge = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <LinearGradient
      colors={[theme.colors.brand.primary, theme.colors.brand.primaryPressed]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.badge}
    >
      <CheckCircle
        size={12}
        color={theme.colors.brand.accent}
        strokeWidth={3}
        style={styles.icon}
      />
      <Text style={[styles.label, { color: theme.colors.text.onBrand }]}>PUBLISHED</Text>
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
    icon: {
      marginRight: 5,
    },
    label: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
  });
