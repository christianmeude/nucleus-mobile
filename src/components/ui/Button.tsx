import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'accent' | 'danger' | 'success';
type ButtonSize = 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  accessibilityLabel?: string;
  icon?: React.ReactNode;
}

export const Button = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  accessibilityLabel,
  icon,
}: ButtonProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isBlocked = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isBlocked}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[`${variant}Base`],
        isBlocked ? styles.blocked : null,
        pressed && !isBlocked ? styles[`${variant}Pressed`] : null,
        pressed && !isBlocked ? styles.pressedScale : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary'
              ? theme.colors.text.onBrand
              : variant === 'accent'
                ? theme.colors.brand.accent
                : variant === 'danger'
                  ? theme.colors.state.danger
                  : variant === 'success'
                    ? theme.colors.state.success
                    : theme.colors.brand.primary
          }
        />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: 44,
      borderRadius: t.radii.md,
      paddingHorizontal: t.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: t.spacing.sm,
    },
    md: {
      minHeight: 44,
      paddingVertical: t.spacing.sm,
    },
    sm: {
      minHeight: 44,
      paddingVertical: t.spacing.xs,
    },
    primaryBase: {
      backgroundColor: t.colors.brand.primary,
    },
    primaryPressed: {
      backgroundColor: t.colors.brand.primaryPressed,
    },
    primaryLabel: {
      color: t.colors.text.onBrand,
    },
    secondaryBase: {
      backgroundColor: t.colors.surface.raised,
      borderWidth: 1,
      borderColor: t.colors.brand.primary,
    },
    secondaryPressed: {
      backgroundColor: t.colors.brand.primarySoft,
    },
    secondaryLabel: {
      color: t.colors.brand.primary,
    },
    subtleBase: {
      backgroundColor: 'transparent',
    },
    subtlePressed: {
      backgroundColor: t.colors.surface.sunken,
    },
    subtleLabel: {
      color: t.colors.brand.primary,
    },
    accentBase: {
      backgroundColor: t.colors.brand.accentSurface,
      borderWidth: 1,
      borderColor: t.colors.brand.accent,
    },
    accentPressed: {
      backgroundColor: t.colors.brand.accentSoft,
    },
    accentLabel: {
      color: t.colors.brand.accent,
    },
    dangerBase: {
      backgroundColor: t.colors.state.dangerSurface,
      borderWidth: 1,
      borderColor: t.colors.state.danger,
    },
    dangerPressed: {
      backgroundColor: t.colors.state.dangerSurface, // Rely on scale for feedback
    },
    dangerLabel: {
      color: t.colors.state.danger,
    },
    successBase: {
      backgroundColor: t.colors.state.success,
    },
    successPressed: {
      backgroundColor: t.colors.state.success,
    },
    successLabel: {
      color: t.colors.text.onBrand,
    },
    blocked: {
      opacity: 0.6,
    },
    pressedScale: {
      transform: [{ scale: 0.98 }],
    },
    label: {
      ...t.typography.button,
    },
  });
