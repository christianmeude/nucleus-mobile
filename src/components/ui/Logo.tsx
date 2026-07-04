import { Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

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

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  wordmark: {
    color: theme.colors.brand.primary,
    fontFamily: theme.fontFamilies.ui.bold,
    includeFontPadding: false,
  },
});
