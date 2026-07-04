import { StyleSheet, View } from 'react-native';
import { useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

export const Divider = () => {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.divider} />;
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.colors.border.subtle,
      width: '100%',
    },
  });
