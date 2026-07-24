import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui/Icon';
import { Mail, Lock, CircleAlert, Grid3x3, CircleCheck } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Logo, Button } from '../../components/ui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useAnimatedKeyboard,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { supabase } from '../../lib/supabase';

type FocusField = 'email' | 'password' | 'forgotEmail' | 'code' | 'newPassword' | null;

export const LoginScreen = () => {
  const { signIn } = useAuth();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<FocusField>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Bottom Sheet State
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['70%', '90%'], []);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [sheetStep, setSheetStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [sheetSuccessMsg, setSheetSuccessMsg] = useState('');

  // Keyboard state for non-animatable props like placeholder
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardOpen(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardOpen(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Universal Animation Language: Keyboard handling
  const keyboard = useAnimatedKeyboard();

  const animatedContainerStyle = useAnimatedStyle(() => {
    // Decrease the distance the form travels upwards by subtracting 24px from the keyboard height
    // This brings the form closer to the keyboard by about half of its previous gap
    const bottomPadding = keyboard.height.value > 0 ? keyboard.height.value - 24 : 0;
    return {
      paddingBottom: bottomPadding,
    };
  });

  const animatedLogoStyle = useAnimatedStyle(() => {
    // Logo scales down and translates down slightly
    const scale = interpolate(keyboard.height.value, [0, 250], [1, 0.65], Extrapolation.CLAMP);
    const translateY = interpolate(keyboard.height.value, [0, 250], [0, 40], Extrapolation.CLAMP);
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  const animatedWordmarkStyle = useAnimatedStyle(() => {
    // Wordmark fades out when keyboard opens
    const opacity = interpolate(keyboard.height.value, [0, 150], [1, 0], Extrapolation.CLAMP);
    return { opacity };
  });

  // Error Animation
  const errorOpacity = useSharedValue(0);
  const errorTranslateY = useSharedValue(-10);

  useEffect(() => {
    if (error) {
      errorOpacity.value = withTiming(1, { duration: 300 });
      errorTranslateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
      });
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

  const animatedInputWrapperStyle = (field: FocusField) =>
    useAnimatedStyle(() => {
      const isFocused = focused === field;
      return {
        borderColor: withTiming(
          error
            ? theme.colors.state.danger
            : isFocused
              ? theme.colors.brand.accent
              : 'rgba(255, 255, 255, 0.2)',
          { duration: 200 },
        ),
        backgroundColor: withTiming(
          error
            ? theme.colors.state.dangerSurface
            : isFocused
              ? 'rgba(255, 255, 255, 0.12)'
              : 'rgba(255, 255, 255, 0.08)',
          { duration: 200 },
        ),
      };
    });

  // Button Animation
  const buttonScale = useSharedValue(1);

  const animatedBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const animatedBlurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(keyboard.height.value, [0, 250], [0, 1], Extrapolation.CLAMP),
  }));

  const emailWrapStyle = animatedInputWrapperStyle('email');
  const passwordWrapStyle = animatedInputWrapperStyle('password');

  const iconColor = (field: FocusField) =>
    focused === field ? theme.colors.brand.accent : 'rgba(255, 255, 255, 0.6)';

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
    Keyboard.dismiss();
    setIsSubmitting(true);
    setError('');

    const result = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Unable to sign in.');
    }
  };

  const handleSendCode = async () => {
    if (!forgotEmail.trim()) {
      setSheetError('Email is required.');
      return;
    }
    setSheetLoading(true);
    setSheetError('');
    const { data, error: invokeError } = await supabase.functions.invoke('request-otp', {
      body: { email: forgotEmail.trim() },
    });
    setSheetLoading(false);
    if (invokeError) {
      setSheetError(invokeError.message);
    } else if (data?.error) {
      setSheetError(data.error);
    } else {
      setSheetStep(2);
      setSheetSuccessMsg('Verification code sent to your recovery email.');
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim() || !newPassword.trim()) {
      setSheetError('Verification code and new password are required.');
      return;
    }
    setSheetLoading(true);
    setSheetError('');
    const { data, error: invokeError } = await supabase.functions.invoke('verify-otp', {
      body: {
        email: forgotEmail.trim(),
        code: code.trim(),
        newPassword,
      },
    });
    setSheetLoading(false);
    if (invokeError) {
      setSheetError(invokeError.message);
    } else if (data?.error) {
      setSheetError(data.error);
    } else {
      bottomSheetRef.current?.close();
      setShowForgotPassword(false);
      setSheetSuccessMsg('');
      setSheetStep(1);
    }
  };

  const openForgotPassword = () => {
    setForgotEmail(email);
    setSheetStep(1);
    setSheetError('');
    setSheetSuccessMsg('');
    setShowForgotPassword(true);
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.6} />
    ),
    [],
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[
          theme.colors.brand.primarySurface,
          theme.colors.brand.primarySurface,
          theme.colors.brand.primaryHover,
        ]}
        locations={[0, 0.25, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <Pressable
          style={styles.flex}
          onPress={() => {
            Keyboard.dismiss();
            setFocused(null);
          }}
        >
          <Animated.View style={[styles.flex, animatedContainerStyle]}>
            <View style={styles.spacer} />

            <View style={styles.header}>
              <Animated.View style={animatedLogoStyle}>
                <Logo size="xxl" showWordmark wordmarkStyle={animatedWordmarkStyle} />
              </Animated.View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.formContainer}>
              <Animated.View
                style={[StyleSheet.absoluteFill, animatedBlurStyle, { top: -150 }]}
                pointerEvents="none"
              >
                <LinearGradient
                  colors={[
                    'rgba(22, 54, 115, 0)',
                    'rgba(22, 54, 115, 0.75)',
                    'rgba(22, 54, 115, 0.95)',
                  ]}
                  locations={[0, 0.6, 1]}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>

              <View style={styles.inputsWrapper}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email</Text>
                  <Animated.View style={[styles.inputWrap, emailWrapStyle]}>
                    <View style={styles.inputIcon}>
                      <Mail
                        size={20}
                        color={
                          error
                            ? theme.colors.state.danger
                            : focused === 'email'
                              ? theme.colors.brand.accent
                              : 'rgba(255, 255, 255, 0.6)'
                        }
                      />
                    </View>
                    <TextInput
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholder="you@example.com"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      style={styles.input}
                      value={email}
                      onChangeText={(text: string) => {
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
                    <Pressable onPress={openForgotPassword}>
                      <Text style={styles.forgotPasswordText}>Forgot?</Text>
                    </Pressable>
                  </View>
                  <Animated.View style={[styles.inputWrap, passwordWrapStyle]}>
                    <View style={styles.inputIcon}>
                      <Lock
                        size={20}
                        color={
                          error
                            ? theme.colors.state.danger
                            : focused === 'password'
                              ? theme.colors.brand.accent
                              : 'rgba(255, 255, 255, 0.6)'
                        }
                      />
                    </View>
                    <TextInput
                      secureTextEntry
                      placeholder="Enter your password"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      style={styles.input}
                      value={password}
                      onChangeText={(text: string) => {
                        setPassword(text);
                        if (error) setError('');
                      }}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                    />
                  </Animated.View>
                </View>
              </View>

              <Animated.View style={[styles.errorBox, animatedErrorStyle]}>
                <Icon icon={CircleAlert} size={16} color={theme.colors.state.danger} />
                <Text style={styles.error}>{error}</Text>
              </Animated.View>

              <View style={styles.actions}>
                <AnimatedPressable
                  style={[
                    styles.primaryButton,
                    animatedBtnStyle,
                    { backgroundColor: theme.colors.brand.accent },
                    isSubmitting && styles.primaryButtonDisabled,
                  ]}
                  onPress={onSubmit}
                  onPressIn={handleButtonPressIn}
                  onPressOut={handleButtonPressOut}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={theme.colors.brand.primary} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                  )}
                </AnimatedPressable>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </SafeAreaView>

      {showForgotPassword && (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose
          onClose={() => setShowForgotPassword(false)}
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.bottomSheetBackground}
          handleIndicatorStyle={styles.bottomSheetIndicator}
          keyboardBehavior="extend"
          keyboardBlurBehavior="restore"
        >
          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sheetContent}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {sheetStep === 1 ? 'Forgot Password' : 'Reset Password'}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {sheetStep === 1
                  ? "Enter your email address and we'll send you a verification code."
                  : 'Enter the code sent to your email and your new password.'}
              </Text>
            </View>

            {sheetStep === 1 ? (
              <View style={styles.sheetFormGroup}>
                <Text style={styles.sheetLabel}>Email</Text>
                <View
                  style={[
                    styles.sheetInputWrap,
                    focused === 'forgotEmail' && styles.sheetInputWrapFocused,
                  ]}
                >
                  <Icon
                    icon={Mail}
                    size={18}
                    color={iconColor('forgotEmail')}
                    style={styles.sheetInputIcon}
                  />
                  <BottomSheetTextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="you@example.com"
                    placeholderTextColor={theme.colors.text.disabled}
                    style={styles.sheetInput}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    onFocus={() => setFocused('forgotEmail')}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.sheetFormGroup}>
                  <Text style={styles.sheetLabel}>Verification Code</Text>
                  <View
                    style={[
                      styles.sheetInputWrap,
                      focused === 'code' && styles.sheetInputWrapFocused,
                    ]}
                  >
                    <Icon
                      icon={Grid3x3}
                      size={18}
                      color={iconColor('code')}
                      style={styles.sheetInputIcon}
                    />
                    <BottomSheetTextInput
                      autoCapitalize="none"
                      keyboardType="number-pad"
                      placeholder="Enter 6-digit code"
                      placeholderTextColor={theme.colors.text.disabled}
                      style={styles.sheetInput}
                      value={code}
                      onChangeText={setCode}
                      onFocus={() => setFocused('code')}
                      onBlur={() => setFocused(null)}
                    />
                  </View>
                </View>

                <View style={styles.sheetFormGroup}>
                  <Text style={styles.sheetLabel}>New Password</Text>
                  <View
                    style={[
                      styles.sheetInputWrap,
                      focused === 'newPassword' && styles.sheetInputWrapFocused,
                    ]}
                  >
                    <Icon
                      icon={Lock}
                      size={18}
                      color={iconColor('newPassword')}
                      style={styles.sheetInputIcon}
                    />
                    <BottomSheetTextInput
                      secureTextEntry
                      placeholder="Enter new password"
                      placeholderTextColor={theme.colors.text.disabled}
                      style={styles.sheetInput}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      onFocus={() => setFocused('newPassword')}
                      onBlur={() => setFocused(null)}
                    />
                  </View>
                </View>
              </>
            )}

            {sheetError ? (
              <View style={styles.sheetErrorBox}>
                <Icon icon={CircleAlert} size={16} color={theme.colors.state.danger} />
                <Text style={styles.sheetError}>{sheetError}</Text>
              </View>
            ) : null}

            {sheetSuccessMsg && !sheetError ? (
              <View
                style={[
                  styles.sheetErrorBox,
                  { backgroundColor: theme.colors.state.successSurface },
                ]}
              >
                <Icon icon={CircleCheck} size={16} color={theme.colors.state.success} />
                <Text style={[styles.sheetError, { color: theme.colors.state.success }]}>
                  {sheetSuccessMsg}
                </Text>
              </View>
            ) : null}

            <View style={styles.sheetActions}>
              {sheetStep === 1 ? (
                <Pressable
                  style={styles.sheetPrimaryBtn}
                  onPress={handleSendCode}
                  disabled={sheetLoading}
                >
                  {sheetLoading ? (
                    <ActivityIndicator color={theme.colors.brand.primary} />
                  ) : (
                    <Text style={styles.sheetPrimaryBtnText}>Send Reset Code</Text>
                  )}
                </Pressable>
              ) : (
                <Pressable
                  style={styles.sheetPrimaryBtn}
                  onPress={handleResetPassword}
                  disabled={sheetLoading}
                >
                  {sheetLoading ? (
                    <ActivityIndicator color={theme.colors.brand.primary} />
                  ) : (
                    <Text style={styles.sheetPrimaryBtnText}>Reset Password</Text>
                  )}
                </Pressable>
              )}
              <Pressable
                style={styles.sheetCancelBtn}
                onPress={() => setShowForgotPassword(false)}
                disabled={sheetLoading}
              >
                <Text style={styles.sheetCancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </BottomSheetScrollView>
        </BottomSheet>
      )}
    </View>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.brand.primarySurface,
    },
    safeArea: {
      flex: 1,
    },
    flex: {
      flex: 1,
      justifyContent: 'flex-end', // Anchors form to bottom
    },
    spacer: {
      flex: 1,
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    formContainer: {
      paddingHorizontal: theme.spacing['2xl'],
      paddingBottom: theme.spacing['2xl'] * 1.5,
      paddingTop: theme.spacing.md,
      gap: theme.spacing.md, // reduced gap between groups
      zIndex: 1,
    },
    inputsWrapper: {
      gap: theme.spacing.xl, // original gap for inputs
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
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '600',
      fontSize: 13,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    forgotPasswordText: {
      ...theme.typography.bodySmall,
      color: theme.colors.brand.accent,
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
      color: theme.colors.text.onBrand,
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
      fontWeight: '600',
    },
    actions: {
      marginTop: 0,
    },
    primaryButton: {
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.lg,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.level2,
      height: 56,
    },
    primaryButtonDisabled: {
      opacity: 0.8,
    },
    primaryButtonText: {
      ...theme.typography.button,
      color: theme.colors.brand.primary,
      fontSize: 16,
      letterSpacing: 0.5,
    },
    // Bottom Sheet Styles
    bottomSheetBackground: {
      backgroundColor: theme.colors.brand.primaryHover,
      borderTopLeftRadius: theme.radii.xl,
      borderTopRightRadius: theme.radii.xl,
    },
    bottomSheetIndicator: {
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      width: 48,
    },
    sheetContent: {
      padding: theme.spacing['2xl'],
      gap: theme.spacing.xl,
    },
    sheetHeader: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    sheetTitle: {
      ...theme.typography.h2,
      color: theme.colors.text.onBrand,
    },
    sheetSubtitle: {
      ...theme.typography.body,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    sheetLabel: {
      ...theme.typography.label,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    sheetFormGroup: {
      gap: theme.spacing.sm,
    },
    sheetInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: theme.radii.md,
      borderCurve: 'continuous',
      paddingHorizontal: theme.spacing.md,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    sheetInputWrapFocused: {
      borderColor: theme.colors.brand.accent,
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    sheetInputIcon: {
      marginRight: theme.spacing.sm,
    },
    sheetInput: {
      flex: 1,
      paddingVertical: theme.spacing.sm + 2,
      ...theme.typography.body,
      color: theme.colors.text.onBrand,
    },
    sheetErrorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.state.dangerSurface,
      borderRadius: theme.radii.md,
      padding: theme.spacing.sm,
    },
    sheetError: {
      ...theme.typography.bodySmall,
      color: theme.colors.state.danger,
      flexShrink: 1,
    },
    sheetActions: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    sheetPrimaryBtn: {
      backgroundColor: theme.colors.brand.accent,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.lg,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      height: 48,
    },
    sheetPrimaryBtnText: {
      ...theme.typography.button,
      color: theme.colors.brand.primary,
    },
    sheetCancelBtn: {
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetCancelBtnText: {
      ...theme.typography.button,
      color: 'rgba(255, 255, 255, 0.6)',
    },
  });
