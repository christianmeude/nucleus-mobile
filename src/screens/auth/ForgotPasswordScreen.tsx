import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Button, Logo } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { RootStackParamList } from '../../navigation/types';

type ForgotPasswordNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
type ForgotPasswordRouteProp = RouteProp<RootStackParamList, 'ForgotPassword'>;
type FocusField = 'email' | 'code' | 'password' | null;

export const ForgotPasswordScreen = () => {
  const navigation = useNavigation<ForgotPasswordNavigationProp>();
  const route = useRoute<ForgotPasswordRouteProp>();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(route.params?.email || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [focused, setFocused] = useState<FocusField>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    setLoading(true);
    setError('');
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    
    setLoading(false);
    
    if (resetError) {
      setError(resetError.message);
    } else {
      setStep(2);
      setSuccessMsg('Verification code sent to your email.');
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim() || !newPassword.trim()) {
      setError('Verification code and new password are required.');
      return;
    }

    setLoading(true);
    setError('');
    
    // Verify OTP for password recovery
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'recovery',
    });
    
    if (verifyError) {
      setLoading(false);
      setError(verifyError.message);
      return;
    }
    
    // Now the user is signed in temporarily, update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    setLoading(false);
    
    if (updateError) {
      setError(updateError.message);
    } else {
      // Successfully updated password, navigate back to login
      // auth context will probably pick up the session and redirect automatically if we don't sign them out,
      // but in this flow we might just let AuthContext handle the navigation.
      // If we want them to log in again:
      await supabase.auth.signOut();
      navigation.replace('Login');
    }
  };

  const iconColor = (field: FocusField) =>
    focused === field ? theme.colors.brand.primary : theme.colors.text.muted;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />
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
            <Logo size="lg" showWordmark={false} />
            <View style={styles.headingBlock}>
              <Text style={styles.title}>{step === 1 ? 'Forgot Password' : 'Reset Password'}</Text>
              <View style={styles.accentUnderline} />
            </View>
            <Text style={styles.subtitle}>
              {step === 1 
                ? "Enter your email address and we'll send you a verification code."
                : "Enter the code sent to your email and your new password."}
            </Text>
          </View>

          <View style={styles.card}>
            {step === 1 ? (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputWrap, focused === 'email' && styles.inputWrapFocused]}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={iconColor('email')}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="you@example.com"
                    placeholderTextColor={theme.colors.text.disabled}
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Verification Code</Text>
                  <View style={[styles.inputWrap, focused === 'code' && styles.inputWrapFocused]}>
                    <Ionicons
                      name="keypad-outline"
                      size={18}
                      color={iconColor('code')}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      autoCapitalize="none"
                      keyboardType="number-pad"
                      placeholder="Enter 6-digit code"
                      placeholderTextColor={theme.colors.text.disabled}
                      style={styles.input}
                      value={code}
                      onChangeText={setCode}
                      onFocus={() => setFocused('code')}
                      onBlur={() => setFocused(null)}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={[styles.inputWrap, focused === 'password' && styles.inputWrapFocused]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={iconColor('password')}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      secureTextEntry
                      placeholder="Enter new password"
                      placeholderTextColor={theme.colors.text.disabled}
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                    />
                  </View>
                </View>
              </>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={theme.colors.state.danger} />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            {successMsg && !error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.colors.state.successSurface }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.state.success} />
                <Text style={[styles.error, { color: theme.colors.state.success }]}>{successMsg}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              {step === 1 ? (
                <Button
                  label="Send Reset Code"
                  onPress={handleSendCode}
                  loading={loading}
                  disabled={loading}
                />
              ) : (
                <Button
                  label="Reset Password"
                  onPress={handleResetPassword}
                  loading={loading}
                  disabled={loading}
                />
              )}
              
              <Button
                label="Back to Login"
                variant="subtle"
                onPress={() => navigation.goBack()}
                disabled={loading}
              />
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
      top: -130,
      right: -90,
      width: 300,
      height: 300,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.brand.primarySoft,
    },
    blobBottom: {
      position: 'absolute',
      bottom: -150,
      left: -120,
      width: 320,
      height: 320,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.brand.primarySurface,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: theme.spacing.xl,
      gap: theme.spacing.xl,
    },
    header: {
      alignItems: 'center',
      gap: theme.spacing.md,
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
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    card: {
      backgroundColor: theme.colors.surface.raised,
      borderRadius: theme.radii.xl,
      borderCurve: 'continuous',
      padding: theme.spacing.xl,
      gap: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border.subtle,
      ...theme.shadows.level2,
    },
    formGroup: {
      gap: theme.spacing.xs,
    },
    label: {
      ...theme.typography.label,
      color: theme.colors.text.secondary,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.border.subtle,
      borderRadius: theme.radii.md,
      borderCurve: 'continuous',
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface.sunken,
    },
    inputWrapFocused: {
      borderColor: theme.colors.brand.primary,
      backgroundColor: theme.colors.brand.primarySurface,
    },
    inputIcon: {
      marginRight: theme.spacing.sm,
    },
    input: {
      flex: 1,
      paddingVertical: theme.spacing.sm + 2,
      ...theme.typography.body,
      color: theme.colors.text.primary,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.state.dangerSurface,
      borderRadius: theme.radii.md,
      padding: theme.spacing.sm,
    },
    error: {
      ...theme.typography.bodySmall,
      color: theme.colors.state.danger,
      flexShrink: 1,
    },
    actions: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
  });
