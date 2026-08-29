import { StyleSheet, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { Icon } from './Icon';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmitEditing?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const SearchField = ({
  value,
  onChangeText,
  placeholder = 'Search papers, authors, keywords',
  onSubmitEditing,
  accessibilityLabel = 'Search papers',
  accessibilityHint,
}: SearchFieldProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.wrap}>
      <Icon icon={Search} size={18} color={theme.colors.text.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="search"
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.disabled}
        style={styles.input}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      />
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
      backgroundColor: t.colors.surface.sunken,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
      borderRadius: t.radii.md,
      borderCurve: 'continuous',
      paddingHorizontal: t.spacing.md,
      height: 44,
    },
    input: {
      flex: 1,
      ...t.typography.body,
      color: t.colors.text.primary,
      paddingVertical: 0,
      height: '100%',
    },
  });
