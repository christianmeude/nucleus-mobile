import { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/ui/Icon';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';

export const ResearchDetailHeader = ({ navigation, options }: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const title =
    typeof options.title === 'string' && options.title.length > 0
      ? options.title
      : 'Research Detail';

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top,
          backgroundColor: theme.colors.surface.base,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          <Icon icon={ChevronLeft} size={24} color={theme.colors.brand.primary} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.sideSpacer} />
      </View>
    </View>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border.subtle,
    },
    row: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
    },
    back: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.98 }],
    },
    title: {
      flex: 1,
      ...theme.typography.h3,
      color: theme.colors.text.primary,
    },
    sideSpacer: {
      width: 44,
      height: 44,
    },
  });
