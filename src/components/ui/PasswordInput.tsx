import { useState, type ElementType } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Icon } from './Icon';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  inputStyle?: StyleProp<TextStyle>;
  iconColor?: string;
  accessibilityLabel?: string;
  showAccessibilityLabel?: string;
  hideAccessibilityLabel?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  component?: ElementType;
}

/**
 * Password field with tap-to-toggle peek. Defaults to hidden.
 * Pass `component={BottomSheetTextInput}` inside bottom sheets.
 */
export const PasswordInput = ({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  inputStyle,
  iconColor,
  accessibilityLabel = 'Password',
  showAccessibilityLabel = 'Show password',
  hideAccessibilityLabel = 'Hide password',
  onFocus,
  onBlur,
  autoCapitalize = 'none',
  returnKeyType,
  component: Component,
}: PasswordInputProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [visible, setVisible] = useState(false);
  const ResolvedComponent = (Component ?? TextInput) as ElementType;
  const toggleColor = iconColor ?? theme.colors.text.muted;

  return (
    <>
      <ResolvedComponent
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor ?? theme.colors.text.muted}
        style={[styles.input, inputStyle]}
        accessibilityLabel={accessibilityLabel}
        textContentType="password"
        autoComplete="password"
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        returnKeyType={returnKeyType}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="switch"
        accessibilityState={{ checked: visible }}
        accessibilityLabel={visible ? hideAccessibilityLabel : showAccessibilityLabel}
        hitSlop={12}
        style={styles.toggle}
      >
        <Icon icon={visible ? EyeOff : Eye} size={18} color={toggleColor} />
      </Pressable>
    </>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    input: {
      flex: 1,
    },
    toggle: {
      padding: t.spacing.xs,
      marginLeft: t.spacing.xs,
    },
  });
