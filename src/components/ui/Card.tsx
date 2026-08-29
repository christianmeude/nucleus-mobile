import { ReactNode } from 'react';
import { PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Surface } from './Surface';
import { PressableScale } from './motion/PressableScale';
import { useListEntranceActive } from '../ListEntranceItem';

type SurfaceElevation = 'level0' | 'level1' | 'level2';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: keyof Theme['spacing'] | 'none';
  elevation?: SurfaceElevation;
}

type PressableCardProps = CardProps & {
  onPress: NonNullable<PressableProps['onPress']>;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export const Card = ({ children, style, padding = 'md', elevation = 'level0' }: CardProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Surface
      elevation={elevation}
      style={[styles.card, padding !== 'none' && { padding: theme.spacing[padding] }, style]}
    >
      {children}
    </Surface>
  );
};

export const PressableCard = ({
  children,
  style,
  padding = 'md',
  elevation = 'level0',
  onPress,
  disabled,
  accessibilityLabel,
}: PressableCardProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isEntering = useListEntranceActive();

  const activeElevation = isEntering ? 'level0' : elevation;

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
      <Surface
        elevation={activeElevation}
        style={[styles.card, padding !== 'none' && { padding: theme.spacing[padding] }, style]}
      >
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
      backgroundColor: t.colors.surface.raised,
    },
    pressable: {
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
    },
    disabled: {
      opacity: 0.6,
    },
  });
