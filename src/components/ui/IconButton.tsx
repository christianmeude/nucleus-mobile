import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Icon } from './Icon';

interface IconButtonProps {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  style?: ViewStyle;
}

export const IconButton = ({
  icon,
  onPress,
  accessibilityLabel,
  color,
  style,
}: IconButtonProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const iconColor = color ?? theme.colors.brand.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        style,
        pressed ? styles.pressed : null,
        pressed ? styles.pressedScale : null,
      ]}
    >
      <Icon icon={icon} size={20} color={iconColor} />
    </Pressable>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    button: {
      minHeight: 44,
      minWidth: 44,
      borderRadius: t.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.surface.raised,
      borderWidth: 1,
      borderColor: t.colors.border.subtle,
    },
    pressed: {
      backgroundColor: t.colors.surface.sunken,
    },
    pressedScale: {
      transform: [{ scale: 0.98 }],
    },
  });
