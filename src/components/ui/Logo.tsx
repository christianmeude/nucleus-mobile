import { Image, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

const sizeMap = {
  sm: { mark: 48, wordmark: 16, tracking: 3 },
  md: { mark: 64, wordmark: 20, tracking: 4 },
  lg: { mark: 96, wordmark: 24, tracking: 5 },
} as const;

export const Logo = ({ size = 'md', showWordmark = true }: LogoProps) => {
  const styles = useThemedStyles(makeStyles);
  const token = sizeMap[size];

  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/images/nucleus-mark.png')}
        style={{ width: token.mark, height: token.mark }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {showWordmark ? (
        <Text style={[styles.wordmark, { fontSize: token.wordmark, letterSpacing: token.tracking }]}>
          NUCLEUS
        </Text>
      ) : null}
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing.sm,
    },
    wordmark: {
      color: t.colors.brand.primary,
      fontFamily: t.fontFamilies.ui.bold,
      includeFontPadding: false,
    },
  });
