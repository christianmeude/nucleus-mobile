import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

interface StatProps {
  label: string;
  value: number | string;
  tone?: 'default' | 'warning';
}

export const Stat = ({ label, value, tone = 'default' }: StatProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={[styles.card, tone === 'warning' ? styles.cardWarning : null, theme.shadows.level1]}
    >
      <Text style={[styles.value, tone === 'warning' ? styles.valueWarning : null]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.colors.surface.raised,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderColor: t.colors.border.subtle,
      padding: t.spacing.md,
      gap: t.spacing.xs,
    },
    cardWarning: {
      borderColor: t.colors.state.warning,
      backgroundColor: t.colors.state.warningSurface,
    },
    value: {
      ...t.typography.h2,
      color: t.colors.text.primary,
    },
    valueWarning: {
      color: t.colors.state.warning,
    },
    label: {
      ...t.typography.metadata,
      color: t.colors.text.muted,
    },
  });
