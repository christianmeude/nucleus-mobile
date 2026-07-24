import { ReactNode } from 'react';
import { PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Surface } from './Surface';
import { PressableScale } from './motion/PressableScale';


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
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.pressable,
        disabled ? styles.disabled : null,
      ]}
    >
      <Surface style={[styles.card, { padding: theme.spacing[padding] }, style]}>
        {children}
      </Surface>
    </PressableScale>
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
    disabled: {
      opacity: 0.6,
    },
  });
