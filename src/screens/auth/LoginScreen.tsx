import { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui/Icon';
import { Mail, Lock, CircleAlert } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Logo } from '../../components/ui';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

type FocusField = 'email' | 'password' | null;

export const LoginScreen = () => {
  const navigation = useNavigation<LoginNavigationProp>();
  const { signIn } = useAuth();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<FocusField>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Background Blob Animations
  const blob1Y = useSharedValue(0);
  const blob1X = useSharedValue(0);
  const blob2Y = useSharedValue(0);
  const blob2X = useSharedValue(0);

  useEffect(() => {
    blob1Y.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    blob1X.value = withRepeat(
      withSequence(
        withTiming(20, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 5000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    blob2Y.value = withRepeat(
      withSequence(
        withTiming(25, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    blob2X.value = withRepeat(
      withSequence(
        withTiming(-25, { duration: 5500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 5500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedBlob1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: blob1Y.value }, { translateX: blob1X.value }],
  }));

  const animatedBlob2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: blob2Y.value }, { translateX: blob2X.value }],
  }));

  // Error Animation
  const errorOpacity = useSharedValue(0);
  const errorTranslateY = useSharedValue(-10);

  useEffect(() => {
    if (error) {
      errorOpacity.value = withTiming(1, { duration: 300 });
      errorTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.back(1.5)) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      errorOpacity.value = withTiming(0, { duration: 200 });
      errorTranslateY.value = withTiming(-10, { duration: 200 });
    }
  }, [error]);

  const animatedErrorStyle = useAnimatedStyle(() => ({
    opacity: errorOpacity.value,
    transform: [{ translateY: errorTranslateY.value }],
  }));

  const animatedInputWrapperStyle = useAnimatedStyle(() => {
    return {
      borderColor: withTiming(
        error ? theme.colors.state.danger : focused ? theme.colors.brand.primary : 'rgba(150, 150, 150, 0.2)',
        { duration: 200 }
      ),
      backgroundColor: withTiming(
        error ? theme.colors.state.dangerSurface : focused ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)',
        { duration: 200 }
      )
    };
  });

  // Button Animation
  const buttonScale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleButtonPressIn = () => {
    buttonScale.value = withTiming(0.96, { duration: 150 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withTiming(1, { duration: 150 });
  };

  const onSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const result = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Unable to sign in.');
    }
  };

  const iconColor = (field: FocusField) =>
    error ? theme.colors.state.danger : focused === field ? theme.colors.brand.primary : theme.colors.text.muted;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.blobTop, animatedBlob1Style]} />
      <Animated.View style={[styles.blobBottom, animatedBlob2Style]} />
      
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 24 })}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Logo size="lg" showWordmark />
            <View style={styles.headingBlock}>
              <Text style={styles.title}>Welcome back</Text>
              <View style={styles.accentUnderline} />
            </View>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <Animated.View style={[styles.inputWrap, animatedInputWrapperStyle]}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="light" />
                <Icon icon={Mail} size={20} color={iconColor('email')} style={styles.inputIcon} />
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={theme.colors.text.disabled}
                  style={styles.input}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError('');
                  }}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                />
              </Animated.View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <Pressable onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() })}>
                  <Text style={styles.forgotPasswordText}>Forgot?</Text>
                </Pressable>
              </View>
              <Animated.View style={[styles.inputWrap, animatedInputWrapperStyle]}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="light" />
                <Icon
                  icon={Lock}
                  size={20}
                  color={iconColor('password')}
                  style={styles.inputIcon}
                />
                <TextInput
                  secureTextEntry
                  placeholder="Enter your password"
                  placeholderTextColor={theme.colors.text.disabled}
                  style={styles.input}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError('');
                  }}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                />
              </Animated.View>
            </View>

            <Animated.View style={[styles.errorBox, animatedErrorStyle]}>
              <Icon icon={CircleAlert} size={16} color={theme.colors.state.danger} />
              <Text style={styles.error}>{error}</Text>
            </Animated.View>

            <View style={styles.actions}>
              <Animated.View style={animatedButtonStyle}>
                <Pressable
                  style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
                  onPress={onSubmit}
                  onPressIn={handleButtonPressIn}
                  onPressOut={handleButtonPressOut}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={theme.colors.text.onBrand} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                  )}
                </Pressable>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    flex: {
      flex: 1,
    },
    blobTop: {
      position: 'absolute',
      top: -100,
      right: -80,
      width: 350,
      height: 350,
      borderRadius: 175,
      backgroundColor: theme.colors.brand.primarySoft,
      opacity: 0.7,
      transform: [{ scale: 1.1 }],
    },
    blobBottom: {
      position: 'absolute',
      bottom: -120,
      left: -100,
      width: 380,
      height: 380,
      borderRadius: 190,
      backgroundColor: theme.colors.brand.primarySurface,
      opacity: 0.8,
      transform: [{ scale: 1.2 }],
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: theme.spacing.xl,
      gap: theme.spacing['2xl'],
    },
    header: {
      alignItems: 'center',
      gap: theme.spacing.md,
      marginTop: theme.spacing['2xl'],
    },
    headingBlock: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    title: {
      ...theme.typography.h1,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    accentUnderline: {
      width: 44,
      height: 3,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.brand.accent,
    },
    formContainer: {
      gap: theme.spacing.lg,
      zIndex: 1,
    },
    formGroup: {
      gap: theme.spacing.sm,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      ...theme.typography.label,
      color: theme.colors.text.primary,
      fontWeight: '600',
    },
    forgotPasswordText: {
      ...theme.typography.bodySmall,
      color: theme.colors.brand.primary,
      fontWeight: '600',
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: theme.radii.lg,
      borderCurve: 'continuous',
      paddingHorizontal: theme.spacing.md,
      overflow: 'hidden',
    },
    inputIcon: {
      marginRight: theme.spacing.sm,
      zIndex: 2,
    },
    input: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      ...theme.typography.body,
      color: theme.colors.text.primary,
      zIndex: 2,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      marginTop: -theme.spacing.sm,
    },
    error: {
      ...theme.typography.bodySmall,
      color: theme.colors.state.danger,
      flexShrink: 1,
      fontWeight: '500',
    },
    actions: {
      marginTop: theme.spacing.md,
    },
    primaryButton: {
      backgroundColor: theme.colors.brand.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.lg,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.level1,
      height: 56,
    },
    primaryButtonDisabled: {
      opacity: 0.8,
    },
    primaryButtonText: {
      ...theme.typography.button,
      color: theme.colors.text.onBrand,
    },
  });
