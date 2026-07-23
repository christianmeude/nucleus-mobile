import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import BottomSheet, { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
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
  const [sheetStep, setSheetStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [sheetSuccessMsg, setSheetSuccessMsg] = useState('');

  // Background Blob Animations
  const blob1Y = useSharedValue(0);
  const blob1X = useSharedValue(0);
  const blob2Y = useSharedValue(0);
  const blob2X = useSharedValue(0);
  const blob3Y = useSharedValue(0);
  const blob3X = useSharedValue(0);

  useEffect(() => {
    blob1Y.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    blob1X.value = withRepeat(
      withSequence(
        withTiming(30, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 5000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    blob2Y.value = withRepeat(
      withSequence(
        withTiming(40, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    blob2X.value = withRepeat(
      withSequence(
        withTiming(-40, { duration: 5500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 5500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    blob3Y.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
        withTiming(20, { duration: 6000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    blob3X.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: 7000, easing: Easing.inOut(Easing.ease) }),
        withTiming(30, { duration: 7000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedBlob1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: blob1Y.value }, { translateX: blob1X.value }, { scale: 1.3 }],
  }));

  const animatedBlob2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: blob2Y.value }, { translateX: blob2X.value }, { scale: 1.4 }],
  }));

  const animatedBlob3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: blob3Y.value }, { translateX: blob3X.value }, { scale: 1.2 }],
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
        error ? theme.colors.state.danger : focused === 'email' || focused === 'password' ? theme.colors.brand.primary : 'rgba(255, 255, 255, 0.3)',
        { duration: 200 }
      ),
      backgroundColor: withTiming(
        error ? theme.colors.state.dangerSurface : focused === 'email' || focused === 'password' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)',
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
      setSheetSuccessMsg('');
      setSheetStep(1);
    }
  };

  const openForgotPassword = () => {
    setForgotEmail(email);
    setSheetStep(1);
    setSheetError('');
    setSheetSuccessMsg('');
    bottomSheetRef.current?.expand();
  };

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.6} />,
    []
  );

  const iconColor = (field: FocusField) =>
    error && (field === 'email' || field === 'password') ? theme.colors.state.danger : focused === field ? theme.colors.brand.primary : theme.colors.text.muted;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.blobTop, animatedBlob1Style]} />
      <Animated.View style={[styles.blobBottom, animatedBlob2Style]} />
      <Animated.View style={[styles.blobMiddle, animatedBlob3Style]} />
      
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

          <View style={styles.glassContainer}>
            <BlurView intensity={60} style={StyleSheet.absoluteFill} tint="light" />
            
            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <Animated.View style={[styles.inputWrap, animatedInputWrapperStyle]}>
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
                  <Pressable onPress={openForgotPassword}>
                    <Text style={styles.forgotPasswordText}>Forgot?</Text>
                  </Pressable>
                </View>
                <Animated.View style={[styles.inputWrap, animatedInputWrapperStyle]}>
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{sheetStep === 1 ? 'Forgot Password' : 'Reset Password'}</Text>
            <Text style={styles.sheetSubtitle}>
              {sheetStep === 1
                ? "Enter your email address and we'll send you a verification code."
                : 'Enter the code sent to your email and your new password.'}
            </Text>
          </View>

          {sheetStep === 1 ? (
            <View style={styles.formGroup}>
              <Text style={styles.sheetLabel}>Email</Text>
              <View style={[styles.sheetInputWrap, focused === 'forgotEmail' && styles.sheetInputWrapFocused]}>
                <Icon icon={Mail} size={18} color={iconColor('forgotEmail')} style={styles.sheetInputIcon} />
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
              <View style={styles.formGroup}>
                <Text style={styles.sheetLabel}>Verification Code</Text>
                <View style={[styles.sheetInputWrap, focused === 'code' && styles.sheetInputWrapFocused]}>
                  <Icon icon={Grid3x3} size={18} color={iconColor('code')} style={styles.sheetInputIcon} />
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

              <View style={styles.formGroup}>
                <Text style={styles.sheetLabel}>New Password</Text>
                <View style={[styles.sheetInputWrap, focused === 'newPassword' && styles.sheetInputWrapFocused]}>
                  <Icon icon={Lock} size={18} color={iconColor('newPassword')} style={styles.sheetInputIcon} />
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
            <View style={[styles.sheetErrorBox, { backgroundColor: theme.colors.state.successSurface }]}>
              <Icon icon={CircleCheck} size={16} color={theme.colors.state.success} />
              <Text style={[styles.sheetError, { color: theme.colors.state.success }]}>
                {sheetSuccessMsg}
              </Text>
            </View>
          ) : null}

          <View style={styles.sheetActions}>
            {sheetStep === 1 ? (
              <Button label="Send Reset Code" onPress={handleSendCode} loading={sheetLoading} disabled={sheetLoading} />
            ) : (
              <Button label="Reset Password" onPress={handleResetPassword} loading={sheetLoading} disabled={sheetLoading} />
            )}
            <Button label="Cancel" variant="subtle" onPress={() => bottomSheetRef.current?.close()} disabled={sheetLoading} />
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
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
      top: -120,
      right: -100,
      width: 450,
      height: 450,
      borderRadius: 225,
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
      backgroundColor: theme.colors.brand.primarySurface,
      opacity: 0.85,
    },
    blobMiddle: {
      position: 'absolute',
      top: '30%',
      left: '10%',
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: theme.colors.brand.accent,
      opacity: 0.35,
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
      marginTop: theme.spacing.xl,
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
      height: 4,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.brand.accent,
    },
    glassContainer: {
      borderRadius: theme.radii.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    formContainer: {
      padding: theme.spacing['2xl'],
      gap: theme.spacing.xl,
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
      fontWeight: '700',
      fontSize: 13,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    forgotPasswordText: {
      ...theme.typography.bodySmall,
      color: theme.colors.brand.primary,
      fontWeight: '700',
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
      fontWeight: '600',
    },
    actions: {
      marginTop: theme.spacing.sm,
    },
    primaryButton: {
      backgroundColor: theme.colors.brand.primary,
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
      color: theme.colors.text.onBrand,
      fontSize: 16,
      letterSpacing: 0.5,
    },
    // Bottom Sheet Styles
    bottomSheetBackground: {
      backgroundColor: theme.colors.surface.base,
      borderTopLeftRadius: theme.radii.xl,
      borderTopRightRadius: theme.radii.xl,
    },
    bottomSheetIndicator: {
      backgroundColor: theme.colors.border.subtle,
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
      color: theme.colors.text.primary,
    },
    sheetSubtitle: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
    sheetLabel: {
      ...theme.typography.label,
      color: theme.colors.text.secondary,
    },
    sheetInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.border.subtle,
      borderRadius: theme.radii.md,
      borderCurve: 'continuous',
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface.sunken,
    },
    sheetInputWrapFocused: {
      borderColor: theme.colors.brand.primary,
      backgroundColor: theme.colors.brand.primarySurface,
    },
    sheetInputIcon: {
      marginRight: theme.spacing.sm,
    },
    sheetInput: {
      flex: 1,
      paddingVertical: theme.spacing.sm + 2,
      ...theme.typography.body,
      color: theme.colors.text.primary,
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
  });
