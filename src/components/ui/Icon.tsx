import React from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react-native';

export interface IconProps extends Omit<LucideProps, 'ref'> {
  icon: LucideIcon;
}

export function Icon({ icon: IconComponent, size = 24, color = '#000000', ...rest }: IconProps) {
  return <IconComponent size={size} color={color} {...rest} />;
}
