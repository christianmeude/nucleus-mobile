import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

type SurfaceTone = 'base' | 'raised' | 'sunken';
type SurfaceElevation = 'level0' | 'level1' | 'level2';

interface SurfaceProps {
  children: ReactNode;
  tone?: SurfaceTone;
  elevation?: SurfaceElevation;
  style?: StyleProp<ViewStyle>;
}

export const Surface = ({
  children,
  tone = 'raised',
  elevation = 'level0',
  style,
}: SurfaceProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.shell, styles[tone], theme.shadows[elevation], style]}>
      {children}
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    shell: {
      borderColor: t.colors.border.subtle,
    },
    base: {
      backgroundColor: t.colors.surface.base,
    },
    raised: {
      backgroundColor: t.colors.surface.raised,
    },
    sunken: {
      backgroundColor: t.colors.surface.sunken,
    },
  });
