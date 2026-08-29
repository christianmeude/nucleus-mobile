import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { palette, type Theme } from '../../theme';

type ButtonVariant =
  'primary' | 'secondary' | 'subtle' | 'soft' | 'accent' | 'warning' | 'danger' | 'success';
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
  const { theme, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isBlocked = disabled || loading;
  const isDark = scheme === 'dark';
  const isStateVariant = variant === 'warning' || variant === 'danger' || variant === 'success';

  // State variants are tonal in both modes to avoid "clown car" solid bright colors side-by-side
  const stateStyle = isStateVariant
    ? variant === 'warning'
      ? {
          backgroundColor: theme.colors.state.warningSurface,
          borderColor: isDark ? 'rgba(130, 102, 30, 0.32)' : theme.colors.state.warning,
        }
      : variant === 'danger'
        ? {
            backgroundColor: theme.colors.state.dangerSurface,
            borderColor: isDark ? 'rgba(127, 29, 29, 0.32)' : theme.colors.state.danger,
          }
        : {
            backgroundColor: theme.colors.state.successSurface,
            borderColor: isDark ? 'rgba(6, 95, 70, 0.32)' : theme.colors.state.success,
          }
    : null;

  const statePressedStyle = isStateVariant
    ? variant === 'warning'
      ? {
          backgroundColor: isDark ? 'rgba(130, 102, 30, 0.24)' : theme.colors.state.warning,
          borderColor: isDark ? 'rgba(130, 102, 30, 0.45)' : theme.colors.state.warning,
        }
      : variant === 'danger'
        ? {
            backgroundColor: isDark ? 'rgba(127, 29, 29, 0.24)' : theme.colors.state.danger,
            borderColor: isDark ? 'rgba(127, 29, 29, 0.45)' : theme.colors.state.danger,
          }
        : {
            backgroundColor: isDark ? 'rgba(6, 95, 70, 0.24)' : theme.colors.state.success,
            borderColor: isDark ? 'rgba(6, 95, 70, 0.45)' : theme.colors.state.success,
          }
    : null;

  const stateLabelStyle = isStateVariant
    ? variant === 'warning'
      ? { color: theme.colors.state.warning }
      : variant === 'danger'
        ? { color: theme.colors.state.danger }
        : { color: theme.colors.state.success }
    : null;

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
        isStateVariant ? stateStyle : null,
        isBlocked ? styles.blocked : null,
        pressed && !isBlocked ? styles[`${variant}Pressed`] : null,
        pressed && !isBlocked && isStateVariant ? statePressedStyle : null,
        pressed && !isBlocked ? styles.pressedScale : null,
      ]}
    >
      {({ pressed }) => (
        <>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={
                variant === 'primary'
                  ? theme.colors.text.onBrand
                  : variant === 'accent'
                    ? theme.colors.brand.accent
                    : isStateVariant
                      ? pressed && !isDark
                        ? theme.colors.text.onBrand
                        : stateLabelStyle?.color
                      : theme.colors.brand.primary
              }
            />
          ) : (
            <>
              {icon}
              <Text
                style={[
                  styles.label,
                  styles[`${variant}Label`],
                  isStateVariant ? stateLabelStyle : null,
                  pressed && !isBlocked && isStateVariant && !isDark
                    ? { color: theme.colors.text.onBrand }
                    : null,
                ]}
              >
                {label}
              </Text>
            </>
          )}
        </>
      )}
    </Pressable>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: 44,
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
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
    softBase: {
      backgroundColor: t.colors.brand.primarySoft,
    },
    softPressed: {
      backgroundColor: t.colors.surface.sunken,
    },
    softLabel: {
      color: t.colors.brand.primary,
    },
    accentBase: {
      backgroundColor: t.colors.brand.accent,
      borderWidth: 1,
      borderColor: t.colors.border.subtle,
    },
    accentPressed: {
      backgroundColor: t.colors.brand.accentHover,
      borderWidth: 1,
      borderColor: t.colors.border.subtle,
    },
    accentLabel: {
      color: t.colors.text.onAccent,
    },
    warningBase: {
      borderWidth: 1,
    },
    warningPressed: {
      borderWidth: 1,
    },
    warningLabel: {},
    dangerBase: {
      borderWidth: 1,
    },
    dangerPressed: {
      borderWidth: 1,
    },
    dangerLabel: {},
    successBase: {
      borderWidth: 1,
    },
    successPressed: {
      borderWidth: 1,
    },
    successLabel: {},
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
