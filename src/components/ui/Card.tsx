import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Surface } from './Surface';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: keyof Theme['spacing'];
}

type PressableCardProps = CardProps & {
  onPress: NonNullable<PressableProps['onPress']>;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export const Card = ({ children, style, padding = 'lg' }: CardProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Surface style={[styles.card, { padding: theme.spacing[padding] }, style]}>{children}</Surface>
  );
};

export const PressableCard = ({
  children,
  style,
  padding = 'lg',
  onPress,
  disabled,
  accessibilityLabel,
}: PressableCardProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pressable,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Surface style={[styles.card, { padding: theme.spacing[padding] }, style]}>
        {children}
      </Surface>
    </Pressable>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
    },
    pressable: {
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
    },
    pressed: {
      opacity: 0.96,
      transform: [{ scale: 0.98 }],
    },
    disabled: {
      opacity: 0.6,
    },
  });
