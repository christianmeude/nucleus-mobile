import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: ReactNode;
}

export const EmptyState = ({ title, message, icon }: EmptyStateProps) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: t.spacing['2xl'],
      paddingHorizontal: t.spacing.lg,
      gap: t.spacing.sm,
    },
    icon: {
      marginBottom: t.spacing.xs,
    },
    title: {
      ...t.typography.h3,
      color: t.colors.text.primary,
      textAlign: 'center',
    },
    message: {
      ...t.typography.bodySmall,
      color: t.colors.text.muted,
      textAlign: 'center',
    },
  });
