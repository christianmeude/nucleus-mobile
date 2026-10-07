import { Image, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  showWordmark?: boolean;
  wordmarkStyle?: any;
}

const sizeMap = {
  sm: { mark: 48, wordmark: 16, tracking: 3 },
  md: { mark: 64, wordmark: 20, tracking: 4 },
  lg: { mark: 96, wordmark: 24, tracking: 5 },
  xl: { mark: 128, wordmark: 32, tracking: 6 },
  xxl: { mark: 192, wordmark: 48, tracking: 8 },
} as const;

import Animated from 'react-native-reanimated';

export const Logo = ({ size = 'md', showWordmark = true, wordmarkStyle }: LogoProps) => {
  const styles = useThemedStyles(makeStyles);
  const token = sizeMap[size];

  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/images/nucleus-logo.png')}
        style={{ width: token.mark, height: token.mark }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {showWordmark ? (
        <Animated.Text
          style={[
            styles.wordmark,
            { fontSize: token.wordmark, letterSpacing: token.tracking },
            wordmarkStyle,
          ]}
        >
          NUCLEUS
        </Animated.Text>
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
