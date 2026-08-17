import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

interface BadgeProps {
  value?: string | number;
}

export const Badge = ({ value }: BadgeProps) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.badge}>
      {value !== undefined ? <Text style={styles.text}>{String(value)}</Text> : null}
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    badge: {
      minWidth: 10,
      height: 10,
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
      backgroundColor: t.colors.brand.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: t.spacing.xs,
    },
    text: {
      ...t.typography.caption,
      color: t.colors.text.onAccent,
    },
  });
