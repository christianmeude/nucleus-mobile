import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const PublishedBadge = () => {
  const { theme } = useTheme();

  return (
    <LinearGradient
      colors={[
        theme.colors.brand.accent,
        theme.colors.state.warning, // Adds a warm gold/amber shift
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.badge}
    >
      <CheckCircle size={10} color={theme.colors.text.onBrand} strokeWidth={3} style={styles.icon} />
      <Text style={[styles.label, { color: theme.colors.text.onBrand }]}>PUBLISHED</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    // Subtle shadow for a "gem" feel
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
