import { Icon } from '../../components/ui/Icon';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useThemedStyles, useTheme } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Button } from '../../components/ui';
import { TriangleAlert } from 'lucide-react-native';

export const UnsupportedRoleScreen = () => {
  const { user, signOut } = useAuth();
  const { theme, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const portalUrl = 'https://nu-cleus.app';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.watermarkWrap} pointerEvents="none">
        <Image
          source={require('../../../assets/images/nucleus-logo.png')}
          style={[styles.watermark, { opacity: scheme === 'dark' ? 0.14 : 0.08 }]}
          resizeMode="contain"
          accessible={false}
          accessibilityIgnoresInvertColors
        />
      </View>

      <View style={styles.container}>
        <View style={styles.glassContainer}>
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Icon icon={TriangleAlert} size={36} color={theme.colors.state.warning} />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>Unsupported Role</Text>
              <Text style={styles.description}>
                This mobile app supports Student and Faculty accounts only.
              </Text>
              <Text style={styles.description}>
                Admin and other roles aren&apos;t supported here. Continue on the web portal:
              </Text>
              <Pressable
                onPress={() => Linking.openURL(portalUrl)}
                accessibilityRole="link"
                accessibilityLabel="Open nu-cleus.app web portal"
                hitSlop={8}
              >
                <Text style={styles.link}>nu-cleus.app</Text>
              </Pressable>
              <Text style={styles.roleText}>
                Signed in as: <Text style={{ fontWeight: '700' }}>{user?.role}</Text>
              </Text>
            </View>

            <View style={styles.actions}>
              <Button label="Sign out" onPress={signOut} variant="primary" />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.surface.base,
      overflow: 'hidden',
    },
    watermarkWrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    watermark: {
      width: 320,
      height: 320,
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    glassContainer: {
      borderRadius: theme.radii.xl,
      borderCurve: 'continuous',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      backgroundColor: theme.colors.surface.raised,
      ...theme.shadows.level2,
    },
    content: {
      padding: theme.spacing['2xl'],
      alignItems: 'center',
      gap: theme.spacing.xl,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.state.warningSurface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: theme.colors.surface.base,
      ...theme.shadows.level1,
    },
    textContainer: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    title: {
      ...theme.typography.h2,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    description: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    link: {
      ...theme.typography.body,
      color: theme.colors.text.link,
      textDecorationLine: 'underline',
      textAlign: 'center',
    },
    roleText: {
      ...theme.typography.bodySmall,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.brand.primarySurface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radii.pill,
      borderCurve: 'continuous',
      marginTop: theme.spacing.sm,
      overflow: 'hidden',
    },
    actions: {
      width: '100%',
      marginTop: theme.spacing.sm,
    },
  });
