import { Icon } from '../../components/ui/Icon';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useThemedStyles, useTheme } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Button } from '../../components/ui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { TriangleAlert } from 'lucide-react-native';



export const UnsupportedRoleScreen = () => {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Background Blob Animations (Matching Liquid Glass aesthetic)
  const blob1Y = useSharedValue(0);
  const blob1X = useSharedValue(0);
  const blob2Y = useSharedValue(0);
  const blob2X = useSharedValue(0);

  useEffect(() => {
    blob1Y.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    blob1X.value = withRepeat(
      withSequence(
        withTiming(30, { duration: 5500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 5500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    blob2Y.value = withRepeat(
      withSequence(
        withTiming(40, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    blob2X.value = withRepeat(
      withSequence(
        withTiming(-40, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedBlob1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: blob1Y.value }, { translateX: blob1X.value }, { scale: 1.3 }],
  }));

  const animatedBlob2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: blob2Y.value }, { translateX: blob2X.value }, { scale: 1.4 }],
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.blobTop, animatedBlob1Style]} />
      <Animated.View style={[styles.blobBottom, animatedBlob2Style]} />

      <View style={styles.container}>
        <View style={styles.glassContainer}>
          <BlurView intensity={60} style={StyleSheet.absoluteFill} tint="light" />

          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Icon icon={TriangleAlert} size={36} color={theme.colors.state.warning} />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>Unsupported Role</Text>
              <Text style={styles.description}>
                This mobile app is optimized for Student and Faculty workflows.
              </Text>
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
    blobTop: {
      position: 'absolute',
      top: -120,
      right: -100,
      width: 450,
      height: 450,
      borderRadius: 225,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.brand.primarySoft,
      opacity: 0.8,
    },
    blobBottom: {
      position: 'absolute',
      bottom: -150,
      left: -120,
      width: 480,
      height: 480,
      borderRadius: 240,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.state.warningSurface,
      opacity: 0.85,
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
      borderColor: 'rgba(255, 255, 255, 0.4)',
      ...theme.shadows.level2,
    },
    content: {
      padding: theme.spacing['2xl'],
      alignItems: 'center',
      gap: theme.spacing.xl,
      zIndex: 1,
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
    roleText: {
      ...theme.typography.bodySmall,
      color: theme.colors.brand.primary,
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
