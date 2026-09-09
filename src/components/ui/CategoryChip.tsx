import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { buildCategoryChipPalette } from '../../utils/category';

export interface CategoryChipProps {
  /** Display category name (UUID-guarded upstream). */
  label: string;
  /** Category accent hue; the chip derives its palette from it. */
  accent: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Accessible category label chip. The accent is tinted into the raised-surface
 * card fill and the label color is darkened/lightened until it clears WCAG AA
 * for small text, so the hue stays recognizable without a contrast failure.
 * Shared by Browse and Papers so a category looks the same everywhere.
 */
export const CategoryChip = ({ label, accent, style }: CategoryChipProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { fg, bg } = buildCategoryChipPalette(accent, theme.colors.surface.raised);

  return (
    <View style={[styles.chip, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
    },
    label: {
      fontFamily: t.fontFamilies.ui.semibold,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
  });
