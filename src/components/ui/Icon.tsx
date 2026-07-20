import React from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export interface IconProps extends Omit<LucideProps, 'ref'> {
  icon: LucideIcon;
}

export function Icon({ icon: IconComponent, size = 24, color, ...rest }: IconProps) {
  const { theme } = useTheme();
  return <IconComponent size={size} color={color ?? theme.colors.text.primary} {...rest} />;
}
