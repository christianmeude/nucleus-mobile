import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

interface InlineNoticeProps {
  message: string;
  tone?: NoticeTone;
}

export const InlineNotice = ({ message, tone = 'info' }: InlineNoticeProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const toneStyles: Record<
    NoticeTone,
    { backgroundColor: string; borderColor: string; textColor: string }
  > = {
    info: {
      backgroundColor: theme.colors.brand.primarySoft,
      borderColor: theme.colors.brand.primary,
      textColor: theme.colors.brand.primary,
    },
    success: {
      backgroundColor: theme.colors.state.successSurface,
      borderColor: theme.colors.state.success,
      textColor: theme.colors.state.success,
    },
    warning: {
      backgroundColor: theme.colors.state.warningSurface,
      borderColor: theme.colors.state.warning,
      textColor: theme.colors.state.warning,
    },
    danger: {
      backgroundColor: theme.colors.state.dangerSurface,
      borderColor: theme.colors.state.danger,
      textColor: theme.colors.state.danger,
    },
  };
  const colors = toneStyles[tone];
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.backgroundColor, borderColor: colors.borderColor },
      ]}
    >
      <Text style={[styles.message, { color: colors.textColor }]}>{message}</Text>
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderRadius: t.radii.md,
      borderCurve: 'continuous',
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
    },
    message: {
      ...t.typography.bodySmall,
    },
  });
